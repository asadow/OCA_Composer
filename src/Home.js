import React, { useEffect, useState, useContext } from "react";
import "./App.css";
import { Box } from "@mui/material";
import StartSchema from "./StartSchema/StartSchema";
import SchemaMetadata from "./SchemaMetadata/SchemaMetadata";
import AttributeDetails from "./AttributeDetails/AttributeDetails";
import EntryCodes from "./EntryCodes/EntryCodes";
import LanguageDetails from "./LanguageDetails/LanguageDetails";
import ViewSchema from "./ViewSchema/ViewSchema";
import CreateManually from "./CreateManually/CreateManually";
import Overlays from "./Overlays/Overlays";
import { Context } from "./App";
import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import { useMultiSchema } from "./context/MultiSchemaContext";


const Home = ({
  currentPage,
  setCurrentPage,
  pageForward,
  pageBack,
  showIntroCard,
  setShowIntroCard
}) => {
  // Get context to check if we're editing a specific schema
  const { editingSchemaId, OCAPackage, setEditingSchemaId, overlay, setOverlay } = useContext(Context);
  const { setCurrentPackageId, loadFromLocalStorage, switchToSchema } = useMultiSchema();

  // Register current package fingerprint for persistence namespace
  useEffect(() => {
    const computePackageId = (pkg) => {
      if (!pkg) return null;
      const root = pkg.bundle?.d || "root";
      const deps = (pkg.dependencies || []).map((d) => d?.d).filter(Boolean).sort().join("|");
      return `${root}::${deps}`;
    };
    const id = computePackageId(OCAPackage);
    setCurrentPackageId(id);
    
    // Try to load saved state for this package
    if (id) {
      loadFromLocalStorage(id);
    }
  }, [OCAPackage, setCurrentPackageId, loadFromLocalStorage]);

  // Ensure schema is initialized when entering via EDIT SCHEMA (old flow)
  useEffect(() => {
    if (OCAPackage && !editingSchemaId) {
      const rootSchemaId = OCAPackage.bundle?.d;
      if (rootSchemaId) {
        switchToSchema(rootSchemaId, OCAPackage);
        setEditingSchemaId(rootSchemaId);
      }
    }
  }, [OCAPackage, editingSchemaId, switchToSchema, setEditingSchemaId]);

  // Normalize and load overlay data from OCAPackage so LanguageDetails has labels/lists
  useEffect(() => {
    if (!OCAPackage?.bundle?.overlays) return;
    const pkgOverlays = OCAPackage.bundle.overlays;
    const newOverlay = { ...overlay };

    // Labels: array to { lang3: { attr: label } }
    if (Array.isArray(pkgOverlays.label)) {
      const labelOverlays = {};
      pkgOverlays.label.forEach((labelOverlay) => {
        const lang = labelOverlay?.language;
        if (lang) {
          labelOverlays[lang] = labelOverlay.attribute_labels || {};
        }
      });
      newOverlay.label = labelOverlays;
    }

    // Entry overlays: array to { lang3: { attr: { code: text } } }
    if (Array.isArray(pkgOverlays.entry)) {
      const entryOverlays = {};
      pkgOverlays.entry.forEach((entryOverlay) => {
        const lang = entryOverlay?.language;
        if (lang) {
          entryOverlays[lang] = entryOverlay.attribute_entries || {};
        }
      });
      newOverlay.entry = entryOverlays;
    }

    // Entry codes: object kept as-is
    if (pkgOverlays.entry_code) {
      newOverlay.entry_code = pkgOverlays.entry_code;
    }

    // Pass through other overlays if present
    if (pkgOverlays.unit) newOverlay.unit = pkgOverlays.unit;
    if (pkgOverlays.cardinality) newOverlay.cardinality = pkgOverlays.cardinality;
    if (pkgOverlays.format) newOverlay.format = pkgOverlays.format;
    if (pkgOverlays.character_encoding)
      newOverlay.character_encoding = pkgOverlays.character_encoding;
    if (pkgOverlays.conformance) newOverlay.conformance = pkgOverlays.conformance;

    setOverlay(newOverlay);
  }, [OCAPackage, overlay, setOverlay]);
  
  // Determine if we should use schema-aware components

  const [activeStep, setActiveStep] = useState(0);
  const [steps, setSteps] = useState([
    { label: "Schema Metadata", page: "Metadata" },
    { label: "Attribute Details", page: "Details" },
    { label: "Language-dependent Attribute Details", page: "LanguageDetails" },
    { label: "Overlays", page: "Overlays" },
    { label: "View Schema", page: "View" }
  ]);

  /**
   * inserts a step at the specified position
   * @param {number} position - index at which the step is to be inserted
   * @param {{label: string, page: string}} step - object containing step label and the step's associated page
   * @returns
   */
  const insertStep = (position, step) => {
    setSteps((currentSteps) => {
      // Prevent duplicates even if called multiple times rapidly
      const exists = currentSteps.some((s) => s.label === step.label);
      if (exists) return currentSteps;
      return [
        ...currentSteps.slice(0, position),
        step,
        ...currentSteps.slice(position)
      ];
    });
  };

  const removeStep = (stepLabel) => {
    setSteps((currentSteps) => currentSteps.filter((step) => step.label !== stepLabel));
  };

  // Show Entry Codes step immediately if schema contains list attributes or entry overlays
  useEffect(() => {
    if (!OCAPackage) return;

    const hasArrayAttributes = (() => {
      const attrs = OCAPackage?.bundle?.capture_base?.attributes || {};
      return Object.values(attrs).some((v) => Array.isArray(v));
    })();

    const hasEntryOverlay = (() => {
      const entry = OCAPackage?.bundle?.overlays?.entry;
      if (Array.isArray(entry)) {
        return entry.some((e) => {
          const ae = e?.attribute_entries || {};
          return Object.keys(ae).length > 0;
        });
      }
      return false;
    })();

    const hasEntryCodeOverlay = (() => {
      const ec = OCAPackage?.bundle?.overlays?.entry_code?.attribute_entry_codes;
      if (ec && typeof ec === "object") {
        return Object.keys(ec).length > 0;
      }
      return false;
    })();

    if (hasArrayAttributes || hasEntryOverlay || hasEntryCodeOverlay) {
      insertStep(2, { label: "Entry Codes", page: "Codes" });
    }
  }, [OCAPackage]);

  // Add new page to this list


  // Update active step based on current page
  useEffect(() => {
    const stepIndex = steps.findIndex((step) => step.page === currentPage);
    if (stepIndex !== -1) {
      setActiveStep(stepIndex);
    }
  }, [currentPage, steps]);

  return (
    <>
      <Header currentPage={currentPage} />
      <Box sx={{ flex: 1 }}>
        {/* debug logs removed to prevent noisy renders */}
        {currentPage !== "Start" && currentPage !== "Create" && (
          <div />
        )}
        {currentPage === "Start" && <StartSchema pageForward={pageForward} />}
        {currentPage === "Metadata" && (
          <SchemaMetadata
            pageBack={pageBack}
            pageForward={pageForward}
            showIntroCard={showIntroCard}
            setShowIntroCard={setShowIntroCard}
          />
        )}
        {currentPage === "Details" && (
          <AttributeDetails
            pageBack={pageBack}
            pageForward={pageForward}
            insertStep={insertStep}
            removeStep={removeStep}
          />
        )}
        {currentPage === "Codes" && <EntryCodes />}

        {currentPage === "LanguageDetails" && (
          <LanguageDetails pageBack={pageBack} pageForward={pageForward} />
        )}
        {currentPage === "View" && <ViewSchema pageBack={pageBack} addClearButton />}
        {currentPage === "Create" && <CreateManually />}
        {currentPage === "Overlays" && (
          <Overlays
            pageBack={pageBack}
            pageForward={pageForward}
          />
        )}

      </Box>
      <Footer />
    </>
  );
};

export default Home;
