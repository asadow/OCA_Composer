# Multi-Schema Implementation Guide

## Overview

This document describes the new multi-schema navigation and editing system that allows users to edit nested schemas in OCA packages while preserving all changes across schema switches.

## Key Features

### 1. State Preservation
- **No Data Loss**: Changes made to any schema are preserved when switching between schemas
- **Automatic Persistence**: All changes are automatically saved to localStorage
- **Schema Isolation**: Each schema maintains its own independent state

### 2. Enhanced Navigation
- **Breadcrumb Navigation**: Visual breadcrumbs show the navigation history
- **Back Navigation**: Easy navigation back to previous schemas
- **Schema Switching**: Click any schema in the visualization to edit it
- **Current Schema Indicator**: Clear indication of which schema is being edited

### 3. Robust State Management
- **MultiSchemaContext**: Centralized state management for all schemas
- **Schema-Specific Data**: Each schema maintains its own:
  - Attributes and types
  - Entry codes
  - Language-specific data
  - Overlays and formatting rules
  - Metadata

## Architecture

### Core Components

#### 1. MultiSchemaContext (`src/context/MultiSchemaContext.js`)
The central state management system that:
- Manages schema-specific states
- Handles schema switching
- Provides persistence
- Tracks modifications

#### 2. Enhanced ViewSchema (`src/ViewSchema/ViewSchema.js`)
The main visualization and navigation hub that:
- Shows schema relationships
- Provides navigation controls
- Displays breadcrumbs
- Handles schema switching

#### 3. Schema-Aware Components
Components that work with specific schemas:
- `SchemaAwareAttributeDetails`: Edit attributes for a specific schema
- `SchemaAwareLanguageDetails`: Edit language-specific data
- `SchemaAwareSchemaMetadata`: Edit schema metadata
- `SchemaAwareGrid`: Grid component for attribute editing

### State Structure

Each schema maintains its own state with the following structure:

```javascript
{
  metadata: {
    name: "Schema Name",
    description: "Schema Description",
    languages: ["English", "French"]
  },
  attributes: [
    {
      Attribute: "attributeName",
      Type: "Text",
      Description: "Description",
      Required: false,
      List: false,
      Unit: ""
    }
  ],
  entryCodes: {
    "attributeName": [
      { Code: "001", eng: "English Label", fra: "French Label" }
    ]
  },
  lanAttributeRowData: {
    "eng": [
      {
        Attribute: "attributeName",
        Label: "English Label",
        Description: "English Description",
        List: false
      }
    ]
  },
  overlays: {
    label: {},
    unit: {},
    cardinality: {},
    format: {},
    character_encoding: {},
    conformance: {},
    entry: {}
  },
  // ... other overlay-specific data
  initialized: true
}
```

## Usage Guide

### 1. Loading a Multi-Schema Package

1. Drop a multi-schema JSON file (like `multilevel.json`) onto the application
2. The system will automatically detect the hierarchical structure
3. Navigate to the "View Schema" step to see the visualization

### 2. Navigating Between Schemas

#### Method 1: Visualization Click
1. In the View Schema step, you'll see a visualization of all schemas
2. Click the "Edit" button on any schema node
3. You'll be taken to the editor for that specific schema

#### Method 2: Breadcrumb Navigation
1. Use the breadcrumbs at the top to navigate between schemas
2. Click any schema name in the breadcrumb to switch to it
3. Use the "Back to Previous Schema" button to go back

### 3. Editing Schemas

When editing a specific schema:

1. **Schema Metadata**: Edit the schema name, description, and languages
2. **Attribute Details**: Add, edit, or delete attributes
3. **Language Details**: Configure labels and descriptions for different languages
4. **Overlays**: Configure formatting, validation, and other rules

### 4. State Persistence

- All changes are automatically saved
- Changes persist across browser sessions
- Each package has its own isolated state
- No data loss when switching between schemas

## Technical Implementation

### Key Functions

#### `switchToSchema(schemaId, ocaPackage)`
Switches to editing a specific schema:
- Initializes the schema if not already initialized
- Updates the active schema ID
- Maintains navigation history

#### `updateSchemaState(schemaId, updates)`
Updates the state for a specific schema:
- Merges updates with existing state
- Marks the schema as modified
- Triggers auto-save

#### `exportSchemaChanges(ocaPackage)`
Exports all changes back to OCA package format:
- Applies all modifications to the original package
- Maintains the hierarchical structure
- Preserves all overlay relationships

### Persistence

The system uses localStorage for persistence:
- Each package gets a unique ID based on its structure
- State is automatically saved every second when changes occur
- State is loaded when the same package is opened again

### Error Handling

- Graceful handling of missing schemas
- Validation of attribute names and types
- Error messages for invalid operations
- Recovery from corrupted state

## Migration from Old System

The new system is backward compatible:
- Single-schema packages work as before
- Existing functionality is preserved
- New features are opt-in for multi-schema packages

## Testing

To test the multi-schema functionality:

1. Load `dummyData/multilevel.json`
2. Navigate to View Schema
3. Click "Edit" on different schema nodes
4. Make changes to attributes, labels, etc.
5. Navigate between schemas
6. Verify changes are preserved
7. Export the package and verify changes are included

## Troubleshooting

### Common Issues

1. **Changes not persisting**: Check browser localStorage permissions
2. **Schema not loading**: Verify the JSON structure is valid
3. **Navigation not working**: Ensure the schema ID is properly set

### Debug Information

The system provides debug information in the browser console:
- Schema initialization logs
- State update logs
- Persistence logs

## Future Enhancements

Potential improvements for future versions:
- Collaborative editing
- Schema versioning
- Advanced validation rules
- Schema templates
- Import/export of individual schemas
