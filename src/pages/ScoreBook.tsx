import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { ClassSelector } from "@/components/score-book/ClassSelector";
import { SubjectSelector } from "@/components/score-book/SubjectSelector";
import { ColumnConfigPopover } from "@/components/score-book/ColumnConfigPopover";
import { EditModeControls } from "@/components/score-book/EditModeControls";
import { ScoreTable } from "@/components/score-book/ScoreTable";
import { useScoreBook } from "@/hooks/useScoreBook";
import { Search } from "lucide-react";

export default function ScoreBook() {
  const {
    // State
    classes,
    subjects,
    selectedClassId,
    selectedSubjectId,
    selectedClass,
    filteredStudents,
    scoreBookTemplate,
    tableStructure,
    filteredTableStructure,
    isLoadingClasses,
    isLoadingSubjects,
    isLoadingScores,
    error,
    isEditMode,
    visibleColumns,
    searchTerm,
    // Actions
    setSelectedClassId,
    setSelectedSubjectId,
    setIsEditMode,
    setVisibleColumns,
    setSearchTerm,
    // Handlers
    getScoreValue,
    getScoreChangeType,
    handleScoreChange,
    handleScoreBlur,
    handlePaste,
    handleDiscardChanges,
    handleSaveChanges,
    handlePublish,
  } = useScoreBook();

  const handleToggleColumn = (columnKey: string) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnKey)) {
      newVisibleColumns.delete(columnKey);
    } else {
      newVisibleColumns.add(columnKey);
    }
    setVisibleColumns(newVisibleColumns);
  };

  const handleSelectAll = () => {
    const allColumnKeys = new Set(tableStructure.allPoints.map((point) => `${point.groupCode}-${point.pointCode}`));
    setVisibleColumns(allColumnKeys);
  };

  const handleDeselectAll = () => {
    setVisibleColumns(new Set());
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Sổ điểm học sinh</h1>
        <p className="text-muted-foreground">Nhập điểm học sinh theo lớp</p>
      </div>

      {/* Classes Grid */}
      <ClassSelector
        classes={classes}
        selectedClassId={selectedClassId}
        isLoading={isLoadingClasses}
        error={error}
        onSelectClass={setSelectedClassId}
      />

      {/* Subjects List - Only shown when a class is selected */}
      {selectedClassId && (
        <SubjectSelector
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          selectedClass={selectedClass}
          isLoading={isLoadingSubjects}
          error={error}
          onSelectSubject={setSelectedSubjectId}
        />
      )}

      {/* Scores Table - Only shown when both class and subject are selected */}
      {selectedClassId && selectedSubjectId && (
        <div className="mt-10">
          {isLoadingScores ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="mr-3" />
              <span className="text-sm text-muted-foreground">Đang tải bảng điểm...</span>
            </div>
          ) : !scoreBookTemplate ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải cấu hình bảng điểm...</div>
          ) : (
            <div className="space-y-4">
              {/* Table caption and edit mode controls */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm theo tên học sinh..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ColumnConfigPopover
                    tableStructure={tableStructure}
                    visibleColumns={visibleColumns}
                    onToggleColumn={handleToggleColumn}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                  />
                  <EditModeControls
                    isEditMode={isEditMode}
                    onEnterEditMode={() => setIsEditMode(true)}
                    onSaveChanges={handleSaveChanges}
                    onPublish={handlePublish}
                    onDiscardChanges={handleDiscardChanges}
                  />
                </div>
              </div>
              <ScoreTable
                filteredStudents={filteredStudents}
                filteredTableStructure={filteredTableStructure}
                isEditMode={isEditMode}
                getScoreValue={getScoreValue}
                getScoreChangeType={getScoreChangeType}
                onScoreChange={handleScoreChange}
                onScoreBlur={handleScoreBlur}
                onPaste={handlePaste}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
