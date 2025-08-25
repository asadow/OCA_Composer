# ⚠️ MAINTAINER WARNING: Multi-Schema Architecture Changes

## Critical Decision Required

The current implementation of multi-schema editing is using **band-aid fixes** that create significant technical debt and risk data corruption. A fundamental architectural change is required.

## Current Problems

### 1. **Data Loss Risk**
- Editing schema A, then switching to schema B, **loses all changes** to schema A
- Global state overwrites previous schema data
- Export logic may corrupt nested structure

### 2. **Technical Debt**
- Current fixes are temporary workarounds
- Components assume single-schema editing
- No proper state isolation between schemas

### 3. **Maintenance Issues**
- ~20+ components need refactoring
- Context API usage throughout app needs updating
- Testing strategy needs complete overhaul

## Required Changes

### **Option 1: Full Refactor (Recommended)**
**Timeline**: 2-3 weeks
**Risk**: High initial effort, but sustainable long-term

**Changes Required**:
1. **New Context Architecture**
   - Schema-specific state management
   - Multi-schema data isolation
   - Smart export/import logic

2. **Component Refactoring**
   - All editor components need schema-awareness
   - Navigation state management
   - Cross-schema reference handling

3. **Testing & Validation**
   - Complete test suite rewrite
   - Multi-schema workflow testing
   - Data integrity validation

### **Option 2: Revert to Single-Schema**
**Timeline**: 1 day
**Risk**: Low, but limits functionality

**Changes Required**:
1. Remove multi-schema editing features
2. Restore single-schema functionality
3. Add clear limitations documentation

### **Option 3: Continue Band-Aids**
**Timeline**: Ongoing
**Risk**: **HIGH - Data corruption, technical debt**

**Issues**:
- Data loss will continue
- Technical debt accumulates
- Maintenance becomes increasingly difficult

## Recommendation

**Choose Option 1 (Full Refactor)** for the following reasons:

1. **Data Integrity**: Prevents data loss and corruption
2. **User Experience**: Provides seamless multi-schema editing
3. **Maintainability**: Creates sustainable, testable architecture
4. **Future-Proof**: Supports complex nested schemas

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] New context structure with schema-specific state
- [ ] Schema switching and initialization logic
- [ ] Basic state management functions

### Phase 2: Editor Components (Week 2)
- [ ] Refactor Step 1 (Schema Metadata)
- [ ] Refactor Step 2 (Attribute Details)
- [ ] Refactor Steps 3-6 (Overlays)

### Phase 3: Navigation & Export (Week 3)
- [ ] Smart export logic
- [ ] Navigation state management
- [ ] Testing and validation

## Files That Need Major Changes

### Core Architecture
- `src/App.js` - Context structure
- `src/SchemaVisualization/dataUtils.js` - Schema data handling
- `src/ViewSchema/useExportLogicV2.js` - Export logic

### Editor Components
- `src/SchemaMetadata/` - All components
- `src/AttributeDetails/` - All components
- `src/LanguageDetails/` - All components
- `src/Overlays/` - All components

### Navigation & State
- `src/ViewSchema/ViewSchema.js` - Schema switching
- `src/SchemaVisualization/` - Edit button handling

## Risk Mitigation

### Data Loss Prevention
- Automatic state persistence
- Change tracking and validation
- Backup/restore functionality

### Testing Strategy
- Unit tests for schema state management
- Integration tests for schema switching
- End-to-end tests for complete workflows

## Decision Required

**Please choose one of the three options above and communicate your decision.**

The current band-aid approach is **not sustainable** and will lead to:
- Data corruption issues
- Increasing technical debt
- Difficult maintenance
- Poor user experience

**Recommended Action**: Commit to the full refactor (Option 1) for a sustainable, maintainable solution.

## Contact

If you have questions about the implementation plan or need clarification on any aspect, please reach out for detailed discussion.
