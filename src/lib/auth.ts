import axios from "axios";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
}

export const TOKEN_STORAGE_KEY = "auth_tokens";

export function getStoredTokens(): TokenResponse | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading tokens from storage:", error);
  }
  return null;
}

export function setStoredTokens(tokens: TokenResponse): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error("Error storing tokens:", error);
  }
}

export function clearStoredTokens(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing tokens:", error);
  }
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const formData = new URLSearchParams();
  formData.append("grant_type", "password");
  formData.append(
    "scope",
    "openid profile offline_access IdentityService TenantService InternalGateway BackendAdminAppGateway EmployeeService CategoryService SmasCustomerService AdminSettingService SettingService ClassroomSupervisorService StudentService ScoreBookService MongoDynamicPageService"
  );
  formData.append("username", username);
  formData.append("password", password);

  try {
    const response = await axios.post<TokenResponse>("/api/auth/connect/token", formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokens: TokenResponse = response.data;
    setStoredTokens(tokens);
    return tokens;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorText = error.response?.data || error.message;
      throw new Error(`Login failed: ${error.response?.status} ${error.response?.statusText}. ${errorText}`);
    }
    throw error;
  }
}

export async function refreshToken(): Promise<TokenResponse> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) {
    throw new Error("No refresh token available. Please login again.");
  }

  const formData = new URLSearchParams();
  formData.append("grant_type", "refresh_token");
  formData.append("refresh_token", tokens.refresh_token);

  try {
    const response = await axios.post<TokenResponse>("/api/auth/connect/token", formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const newTokens: TokenResponse = response.data;
    setStoredTokens(newTokens);
    return newTokens;
  } catch (error) {
    // If refresh fails, clear tokens and throw error
    clearStoredTokens();
    if (axios.isAxiosError(error)) {
      const errorText = error.response?.data || error.message;
      throw new Error(`Token refresh failed: ${error.response?.status} ${error.response?.statusText}. ${errorText}`);
    }
    throw error;
  }
}
