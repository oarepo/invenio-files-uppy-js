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
import "./style.css";

import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";

import { useFormikContext } from "formik";
import _get from "lodash/get";
import PropTypes from "prop-types";
import React, { useState } from "react";
import { Button, Grid, Icon, Message } from "semantic-ui-react";
import Overridable from "react-overridable";
import { InvenioMultipartUploader } from "./InvenioMultipartUploader";
import {
  useFilesList,
  FilesListTable,
  FileUploaderToolbar,
} from "@js/invenio_rdm_records";

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

  const filesEnabled = _get(formikDraft, "files.enabled", false);
  const filesSize = filesList.reduce((totalSize, file) => (totalSize += file.size), 0);
  const lockFileUploader = !isDraftRecord && filesLocked;
  const filesLeft = filesList.length < quota.maxFiles;

  const restrictions = {
    minFileSize: allowEmptyFiles ? 0 : 1,
    maxNumberOfFiles: quota.maxFiles - filesList.length,
    maxTotalFileSize: quota.maxStorage - filesSize,
  };

  function checkForDuplicates(file, files) {
    console.log(files, filesList.includes(file.name), filesList, file.name);
  }

  const [uppy] = useState(
    () =>
      new Uppy({
        debug: true,
        autoProceed: true,
        restrictions,
        onBeforeFileAdded: checkForDuplicates,
      }).use(InvenioMultipartUploader, {
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
      })
    // .use(InvenioRecordFilesSource, {})
  );

  React.useEffect(() => {
    const dashboardPlugin = uppy.getPlugin("Dashboard");
    if (!dashboardPlugin) return;
    dashboardPlugin.setOptions({
      disabled: !filesLeft,
    });
  }, [filesLeft, uppy]);

  console.log(uppy.getFiles());

  // TODO: this hook-based approach could be used after React upgrade
  // const filesList = useUppyState(uppy, (state) => state.files);
  // const totalProgress = useUppyState(uppy, (state) => state.totalProgress);

  const displayImportBtn =
    filesEnabled && isDraftRecord && hasParentRecord && !filesList.length;
  return (
    <Grid className="file-uploader">
      <Grid.Row className="pt-10 pb-5">
        {!lockFileUploader && (
          <FileUploaderToolbar
            {...uiProps}
            config={config}
            filesEnabled={filesEnabled}
            filesList={filesList}
            filesSize={filesSize}
            quota={quota}
            decimalSizeDisplay={decimalSizeDisplay}
          />
        )}
      </Grid.Row>
      <Overridable
        id="ReactInvenioDeposit.FileUploader.FileUploaderArea.container"
        filesList={filesList}
        filesLocked={lockFileUploader}
        filesEnabled={filesEnabled}
        deleteFile={deleteFile}
        decimalSizeDisplay={decimalSizeDisplay}
        {...uiProps}
      >
        {filesEnabled && (
          <Grid.Row stretched className="pt-0 pb-0">
            <Grid.Column width={16}>
              <Dashboard
                style={{ width: "100%" }}
                uppy={uppy}
                id="uppy-uploader-dashboard"
                disabled={!filesLeft}
                // `null` means "do not display a Done button in a status bar"
                doneButtonHandler={null}
                {...defaultDashboardProps}
                {...uiProps}
              />
              {filesList.length !== 0 && (
                <Grid.Column verticalAlign="middle">
                  <FilesListTable
                    filesList={filesList}
                    filesEnabled={filesEnabled}
                    filesLocked={lockFileUploader}
                    deleteFile={deleteFile}
                    decimalSizeDislay={decimalSizeDisplay}
                  />
                </Grid.Column>
              )}
            </Grid.Column>
          </Grid.Row>
        )}
      </Overridable>
    </Grid>
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
