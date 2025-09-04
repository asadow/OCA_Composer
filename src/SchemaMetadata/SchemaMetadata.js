import { Box, Button, Typography, Tooltip } from "@mui/material";
import React, { useState, useContext, useEffect, useRef } from "react";

import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Description from "./Description";
import LanguageSelection from "./LanguageSelection";
import NavigationCard from "../constants/NavigationCard";
import CustomPalette from "../constants/customPalette";
import { Context } from "../App";
import { useMultiSchema } from "../context/MultiSchemaContext";
import { removeSpacesFromObjectOfObjects } from "../constants/removeSpaces";
import IntroCard from "./IntroCard";
import IsoCard from "./IsoCard";
import BackNextSkeleton from "../components/BackNextSkeleton";

export default function SchemaMetadata({
  pageBack,
  pageForward,
  showIntroCard,
  setShowIntroCard
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // MultiSchema context for schema-specific metadata
  const { activeSchemaId, getSchemaState, updateSchemaState } = useMultiSchema();
  
  // Local component state
  const [showLanguages, setShowLanguages] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [fieldArray, setFieldArray] = useState([]);
  const [showIsoInput, setShowIsoInput] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState("");
  
  // Global context for app-level state
  const {
    schemaDescription: globalSchemaDescription,
    setSchemaDescription: setGlobalSchemaDescription,
    languages: globalLanguages,
    history,
    setHistory,
    setCurrentPage,
    editingSchemaId
  } = useContext(Context);

  // Use schema-specific data when editing a schema, otherwise use global data
  const currentSchemaId = activeSchemaId || editingSchemaId;
  const currentSchemaState = getSchemaState(currentSchemaId);
  
  // Get schema description and languages from appropriate source
  const schemaDescription = currentSchemaState?.metadata?.description || globalSchemaDescription;
  const languages = currentSchemaState?.metadata?.languages || globalLanguages;
  
  const setSchemaDescription = (newDescription) => {
    if (currentSchemaId) {
      // Update MultiSchemaContext
      updateSchemaState(currentSchemaId, {
        metadata: {
          ...currentSchemaState?.metadata,
          description: newDescription
        }
      });
    } else {
      // Update global context for new schemas
      setGlobalSchemaDescription(newDescription);
    }
  };

  const setLanguages = (newLanguages) => {
    if (currentSchemaId) {
      // Update MultiSchemaContext
      updateSchemaState(currentSchemaId, {
        metadata: {
          ...currentSchemaState?.metadata,
          languages: newLanguages
        }
      });
    } else {
      // Update global context for new schemas
      // Note: Global language updates for new schemas should be handled by global context
    }
  };

  const toTitleCase = (str) =>
    str.toLowerCase().replace(/^(.)|\s(.)/g, (match) => match.toUpperCase());

  const handleForward = () => {
    const noSpacesObject = removeSpacesFromObjectOfObjects(schemaDescription);
    setSchemaDescription(noSpacesObject);
    const spacesArray = [];

    languages.forEach((language) => {
      const allValues = Object.values(noSpacesObject[language]);
      allValues.forEach((value) => {
        if (!value && !spacesArray.includes(toTitleCase(language))) {
          spacesArray.push(toTitleCase(language));
        }
      });
    });
    if (spacesArray.length >= 1) {
      setFieldArray(spacesArray);
      setShowCard(true);
    } else {
      pageForward();
    }
  };

  // When showIsoInput component is visible, prevents user from clicking other buttons on the screen
  const defaultButton = useRef();
  const addCustomButton = useRef();

  useEffect(() => {
    const handleDisableClick = (event) => {
      if (showIsoInput) {
        const { target } = event;
        if (target !== defaultButton.current && target !== addCustomButton.current) {
          event.stopPropagation();
        }
      }
    };

    if (showIsoInput) {
      document.addEventListener("click", handleDisableClick, true);
    }

    return () => {
      document.removeEventListener("click", handleDisableClick, true);
    };
  }, [showIsoInput]);

  const moveBackward = () => {
    if (history.length > 1 && history[history.length - 2] === "Landing") {
      setHistory((prev) => prev.slice(0, prev.length - 1));
      setCurrentPage("Landing");
      navigate("/");
    } else {
      pageBack();
    }
  };

  return (
    <BackNextSkeleton
      isBack
      pageBack={moveBackward}
      isForward
      pageForward={handleForward}
    >
      {showCard && (
        <NavigationCard
          fieldArray={fieldArray}
          setShowCard={setShowCard}
          handleForward={pageForward}
        />
      )}
      {showIntroCard && <IntroCard setShowIntroCard={setShowIntroCard} />}
      {showIsoInput && (
        <IsoCard
          setShowIsoInput={setShowIsoInput}
          language={editingLanguage}
          defaultButton={defaultButton}
          addCustomButton={addCustomButton}
        />
      )}
      <Box
        sx={{
          mt: 2,
          width: "100%"
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: "bold",
              textAlign: "left",
              margin: "1rem 0 1rem 0",
              color: CustomPalette.PRIMARY
            }}
          >
            {t("Schema Description")}
          </Typography>
          <Box sx={{ position: "relative", alignSelf: "flex-end" }}>
            <Box
              sx={{
                alignSelf: "flex-end",
                position: "absolute",
                zIndex: "1000",
                top: 70,
                width: "100%"
              }}
            >
              {showLanguages && (
                <LanguageSelection
                  setShowLanguages={setShowLanguages}
                  setEditingLanguage={setEditingLanguage}
                  setShowIsoInput={setShowIsoInput}
                  languages={languages}
                  setLanguages={setLanguages}
                  schemaDescription={schemaDescription}
                  setSchemaDescription={setSchemaDescription}
                />
              )}
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                color: CustomPalette.GREY_600
              }}
            >
              <Tooltip
                title={t(
                  "Add another language to your schema. Without changing the basic structure of your schema..."
                )}
                placement="left"
                arrow
              >
                <HelpOutlineIcon sx={{ fontSize: 15 }} />
              </Tooltip>
              <Button
                color="button"
                onClick={() => setShowLanguages(!showLanguages)}
                variant="contained"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "11rem",
                  m: 2
                }}
              >
                {t("Add Language")}
                {showLanguages === true ? <RemoveCircleIcon /> : <AddCircleIcon />}
              </Button>
            </Box>
          </Box>
        </Box>
        <Description
          setShowIsoInput={setShowIsoInput}
          setEditingLanguage={setEditingLanguage}
          languages={languages}
        />
      </Box>
    </BackNextSkeleton>
  );
}
