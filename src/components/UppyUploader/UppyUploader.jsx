/*
 * This file is part of Invenio-Files-Uppy-Js.
 * Copyright (C) 2025 CERN.
 * Copyright (C) 2025 CESNET.
 *
 * Invenio-Files-Uppy-Js is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */

// TODO: internationalization using i18next?

import "@uppy/core/dist/style.min.css";
// TODO: reset .uppy-DashboardContent-bar z-index
// TODO: reset .uppy-StatusBar z-index
import "@uppy/dashboard/dist/style.min.css";

import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";

import { useFormikContext } from "formik";
import _get from "lodash/get";
import _isEmpty from "lodash/isEmpty";
import _map from "lodash/map";
import PropTypes from "prop-types";
import React, { useState } from "react";
import { Button, Grid, Icon, Message } from "semantic-ui-react";
import { humanReadableBytes } from "react-invenio-forms";
import Overridable from "react-overridable";
import { InvenioMultipartUploader } from "./InvenioMultipartUploader";
import { useFilesList, FilesListTable } from "@js/invenio_rdm_records";

const defaultDashboardProps = {
  proudlyDisplayPoweredByUppy: false,
  height: "100%",
  width: "100%",
};

export const UppyUploaderComponent = ({
  config,
  files,
  isDraftRecord,
  hasParentRecord,
  quota,
  permissions,
  record,
  uploadFiles,
  initializeFileUpload,
  finalizeUpload,
  deleteFile,
  getUploadParams,
  importParentFiles,
  importButtonIcon,
  importButtonText,
  isFileImportInProgress,
  decimalSizeDisplay,
  filesLocked,
  allowEmptyFiles,
  ...uiProps
}) => {
  // We extract the working copy of the draft stored as `values` in formik
  const { values: formikDraft } = useFormikContext();
  const { filesList } = useFilesList(files);
  const [warningMsg, setWarningMsg] = useState();

  const filesEnabled = _get(formikDraft, "files.enabled", false);
  const filesSize = filesList.reduce((totalSize, file) => (totalSize += file.size), 0);
  const lockFileUploader = !isDraftRecord && filesLocked;

  const restrictions = {
    minFileSize: allowEmptyFiles ? 0 : 1,
    maxNumberOfFiles: quota.maxFiles - filesList.length,
    maxTotalFileSize: quota.maxStorage - filesSize,
  };

  console.log({ files });

  function checkForDuplicates(file, files) {
    console.log(files, filesList.includes(file.name), filesList, file.name);
  }

  const [uppy] = useState(() =>
    new Uppy({ debug: true, restrictions, onBeforeFileAdded: checkForDuplicates }).use(
      InvenioMultipartUploader,
      {
        // Bind Redux file actions to the uploader plugin
        initializeUpload: (file) => initializeFileUpload(formikDraft, file),
        finalizeUpload: (file) => finalizeUpload(file.links.commit, file),
        getUploadParams: (file, options) => getUploadParams(formikDraft, file, options),
        abortUpload: (file, uploadId) =>
          deleteFile(file.links, { params: { uploadId } }),
        // Calculates & verifies checksum for every uploaded part
        // TODO: this feature currently computes part checksums,
        // but S3 presign url don't like it when Content-MD5 header is added
        // *after* their creation. PUT request with this added header
        // results in HTTP 400 Bad Request. Needs more investigation.
        checkPartIntegrity: false,
      }
    )
  );

  // filesList.forEach((file) => uppy.addFile(file));

  // TODO: this hook-based approach could be used after React upgrade
  // const filesList = useUppyState(uppy, (state) => state.files);
  // const totalProgress = useUppyState(uppy, (state) => state.totalProgress);

  // TODO: implement following by uppy

  // const dropzoneParams = {
  //   preventDropOnDocument: true,
  //   onDropAccepted: (acceptedFiles) => {
  //     const filesNames = _map(filesList, "name");
  //     const filesNamesSet = new Set(filesNames);

  //     const { duplicateFiles, emptyFiles, nonEmptyFiles } = acceptedFiles.reduce(
  //       (accumulators, file) => {
  //         if (filesNamesSet.has(file.name)) {
  //           accumulators.duplicateFiles.push(file);
  //         } else if (file.size === 0) {
  //           accumulators.emptyFiles.push(file);
  //         } else {
  //           accumulators.nonEmptyFiles.push(file);
  //         }

  //         return accumulators;
  //       },
  //       { duplicateFiles: [], emptyFiles: [], nonEmptyFiles: [] }
  //     );

  //     const hasEmptyFiles = !_isEmpty(emptyFiles);
  //     const hasDuplicateFiles = !_isEmpty(duplicateFiles);

  //     if (maxFileNumberReached) {
  //       setWarningMsg(
  //         <div className="content">
  //           <Message
  //             warning
  //             icon="warning circle"
  //             // header={i18next.t("Could not upload files.")}
  //             // content={i18next.t(
  //             //   `Uploading the selected files would result in ${
  //             //     filesList.length + acceptedFiles.length
  //             //   } files (max.${quota.maxFiles})`
  //             // )}
  //           />
  //         </div>
  //       );
  //     } else if (maxFileStorageReached) {
  //       setWarningMsg(
  //         <div className="content">
  //           <Message
  //             warning
  //             icon="warning circle"
  //             // header={i18next.t("Could not upload files.")}
  //             content={
  //               <>
  //                 {/* {i18next.t("Uploading the selected files would result in")}{" "} */}
  //                 {humanReadableBytes(
  //                   filesSize + acceptedFilesSize,
  //                   decimalSizeDisplay
  //                 )}
  //                 {/* {i18next.t("but the limit is")} */}
  //                 {humanReadableBytes(quota.maxStorage, decimalSizeDisplay)}.
  //               </>
  //             }
  //           />
  //         </div>
  //       );
  //     } else {
  //       let warnings = [];

  //       if (hasDuplicateFiles) {
  //         warnings.push(
  //           <Message
  //             warning
  //             icon="warning circle"
  //             // header={i18next.t("The following files already exist")}
  //             list={_map(duplicateFiles, "name")}
  //           />
  //         );
  //       }

  //       if (!allowEmptyFiles && hasEmptyFiles) {
  //         warnings.push(
  //           <Message
  //             warning
  //             icon="warning circle"
  //             // header={i18next.t("Could not upload all files.")}
  //             // content={i18next.t("Empty files were skipped.")}
  //             list={_map(emptyFiles, "name")}
  //           />
  //         );
  //       }

  //       if (!_isEmpty(warnings)) {
  //         setWarningMsg(<div className="content">{warnings}</div>);
  //       }

  //       const filesToUpload = allowEmptyFiles
  //         ? [...nonEmptyFiles, ...emptyFiles]
  //         : nonEmptyFiles;

  //       // Proceed with uploading files if there are any to upload
  //       if (!_isEmpty(filesToUpload)) {
  //         uploadFiles(formikDraft, filesToUpload);
  //       }
  //     }
  //   },
  //   multiple: true,
  //   noClick: true,
  //   noKeyboard: true,
  //   disabled: false,
  // };

  const filesLeft = filesList.length < quota.maxFiles;
  if (!filesLeft) {
    // dropzoneParams["disabled"] = true;
  }

  const displayImportBtn =
    filesEnabled && isDraftRecord && hasParentRecord && !filesList.length;
  return (
    <Overridable
      id="ReactInvenioDeposit.FileUploader.FileUploaderArea.container"
      filesList={filesList}
      // dropzoneParams={dropzoneParams}
      filesLocked={lockFileUploader}
      filesEnabled={filesEnabled}
      deleteFile={deleteFile}
      decimalSizeDisplay={decimalSizeDisplay}
      {...uiProps}
    >
      {filesEnabled && (
        <Grid.Row className="pt-0 pb-0">
          <Dashboard
            uppy={uppy}
            id="uppy-uploader-dashboard"
            // `null` means "do not display a Done button in a status bar"
            doneButtonHandler={null}
            {...defaultDashboardProps}
            {...uiProps}
          />
          {filesList.length !== 0 && (
            <Grid.Column verticalAlign="middle">
              <FilesListTable
                filesList={filesList}
                filesLocked={filesLocked}
                deleteFile={deleteFile}
                decimalSizeDislay={decimalSizeDisplay}
              />
            </Grid.Column>
          )}
          <code>
            DEBUG: Uppy capabilities: {JSON.stringify(uppy.getState().capabilities, 2)}
          </code>
        </Grid.Row>
      )}
    </Overridable>
  );
};

const fileDetailsShape = PropTypes.objectOf(
  PropTypes.shape({
    name: PropTypes.string,
    size: PropTypes.number,
    progressPercentage: PropTypes.number,
    checksum: PropTypes.string,
    links: PropTypes.object,
    cancelUploadFn: PropTypes.func,
    state: PropTypes.any, // PropTypes.oneOf(Object.values(UploadState)), can't reach UploadState from here
    enabled: PropTypes.bool,
  })
);

UppyUploaderComponent.propTypes = {
  config: PropTypes.object,
  dragText: PropTypes.string,
  files: fileDetailsShape,
  isDraftRecord: PropTypes.bool,
  hasParentRecord: PropTypes.bool,
  quota: PropTypes.shape({
    maxStorage: PropTypes.number,
    maxFiles: PropTypes.number,
  }),
  record: PropTypes.object,
  uploadButtonIcon: PropTypes.string,
  uploadButtonText: PropTypes.string,
  importButtonIcon: PropTypes.string,
  importButtonText: PropTypes.string,
  isFileImportInProgress: PropTypes.bool,
  importParentFiles: PropTypes.func.isRequired,
  initializeFileUpload: PropTypes.func.isRequired,
  uploadFile: PropTypes.func.isRequired,
  uploadFiles: PropTypes.func.isRequired,
  finalizeUpload: PropTypes.func.isRequired,
  getUploadParams: PropTypes.func.isRequired,
  deleteFile: PropTypes.func.isRequired,
  decimalSizeDisplay: PropTypes.bool,
  filesLocked: PropTypes.bool,
  permissions: PropTypes.object,
  allowEmptyFiles: PropTypes.bool,
};

UppyUploaderComponent.defaultProps = {
  permissions: undefined,
  config: undefined,
  files: undefined,
  record: undefined,
  isFileImportInProgress: false,
  // dragText: i18next.t("Drag and drop files"),
  isDraftRecord: true,
  hasParentRecord: false,
  quota: {
    maxFiles: 5,
    maxStorage: 10 ** 10,
  },
  uploadButtonIcon: "upload",
  // uploadButtonText: i18next.t("Upload files"),
  importButtonIcon: "sync",
  // importButtonText: i18next.t("Import files"),
  decimalSizeDisplay: true,
  filesLocked: false,
  allowEmptyFiles: true,
};
