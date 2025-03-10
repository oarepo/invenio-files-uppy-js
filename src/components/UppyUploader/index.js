/*
 * This file is part of Invenio-Files-Uppy-Js.
 * Copyright (C) 2025 CERN.
 * Copyright (C) 2025 CESNET.
 *
 * Invenio-Files-Uppy-Js is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */
import { connect } from "react-redux";
import {
  deleteFile,
  importParentFiles,
  initializeFileUpload,
  getUploadParams,
  uploadFile,
  uploadFiles,
  finalizeUpload,
} from "@js/invenio_rdm_records";
import { UppyUploaderComponent } from "./UppyUploader";

const mapStateToProps = (state) => {
  const { links, entries } = state.files;
  return {
    files: entries,
    links,
    record: state.deposit.record,
    config: state.deposit.config,
    permissions: state.deposit.permissions,
    isFileImportInProgress: state.files.isFileImportInProgress,
    hasParentRecord: Boolean(
      state.deposit.record?.versions?.index && state.deposit.record?.versions?.index > 1
    ),
  };
};

const mapDispatchToProps = (dispatch) => ({
  initializeFileUpload: (draft, file) => dispatch(initializeFileUpload(draft, file)),
  uploadFile: (draft, file) => dispatch(uploadFile(draft, file)),
  uploadFiles: (draft, files) => dispatch(uploadFiles(draft, files)),
  finalizeUpload: (commitFileURL, file) =>
    dispatch(finalizeUpload(commitFileURL, file)),
  importParentFiles: () => dispatch(importParentFiles()),
  deleteFile: (file, options) => dispatch(deleteFile(file, options)),
  getUploadParams: (draft, file, options) =>
    dispatch(getUploadParams(draft, file, options)),
});

export const UppyUploader = connect(
  mapStateToProps,
  mapDispatchToProps
)(UppyUploaderComponent);
