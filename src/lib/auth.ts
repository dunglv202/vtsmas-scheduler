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

export async function login(
  username: string,
  password: string
): Promise<TokenResponse> {
  const formData = new URLSearchParams();
  formData.append("grant_type", "password");
  formData.append(
    "scope",
    "openid profile IdentityService TenantService InternalGateway BackendAdminAppGateway EmployeeService CategoryService SmasCustomerService AdminSettingService SettingService ClassroomSupervisorService StudentService ScoreBookService MongoDynamicPageService"
  );
  formData.append("username", username);
  formData.append("password", password);
  formData.append("client_id", "backend-admin-app-client");
  formData.append("client_secret", "1q2w3e*");

  const response = await fetch("https://sso.vtsmas.vn/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Login failed: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  const tokens: TokenResponse = await response.json();
  setStoredTokens(tokens);
  return tokens;
}
