/*
 * This file is part of Invenio-Files-Uppy-Js.
 * Copyright (C) 2025 CERN.
 * Copyright (C) 2025 CESNET.
 *
 * Invenio-Files-Uppy-Js is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */
import { DepositFilesService } from "@js/invenio_rdm_records";

export class UppyDepositFilesService extends DepositFilesService {
  constructor(fileApiClient, fileUploadConcurrency) {
    super();
    this.fileApiClient = fileApiClient;
    this.maxConcurrentUploads = fileUploadConcurrency || 3;
    // this.uploaderQueue = new UploaderQueue();
  }

  initializeUpload = async (initializeUploadURL, file) => {
    console.log("_IU", initializeUploadURL, file);
    const response = await this.fileApiClient.initializeFileUpload(
      initializeUploadURL,
      file.name,
      file.transferOptions
    );

    // get the init file with the sent filename
    const initializedFile = response.data.entries.filter(
      (entry) => entry.key.normalize() === file.name.normalize()
    )[0]; // this should throw an error if not found

    return initializedFile;
  };

  _doUpload = async (uploadUrl, file) => {
    console.log("_DU", uploadUrl, file);
    await this.fileApiClient.uploadFile(
      uploadUrl,
      file,
      (percent) => this.progressNotifier.onUploadProgress(file.name, percent),
      (cancelFn) => this.progressNotifier.onUploadStarted(file.name, cancelFn)
    );
  };

  finalizeUpload = async (commitFileURL, file) => {
    console.log("_FU", commitFileURL, file);
    // Regardless of what is the status of the finalize step we start
    // the next upload in the queue
    const response = await this.fileApiClient.finalizeFileUpload(commitFileURL);
    return response.data;
  };

  _onError = (file, isCancelled = false) => {
    console.log("_OE", file, isCancelled);
    if (isCancelled) {
      this.progressNotifier.onUploadCancelled(file.name);
    } else {
      this.progressNotifier.onUploadFailed(file.name);
    }
    this.uploaderQueue.markCompleted(file);
    this._startNextUpload();
  };

  _startNewUpload = async (initializeUploadURL, file) => {
    console.log("_SNU", initializeUploadURL, file);
    let initializedFileMetadata;
    try {
      initializedFileMetadata = await this.initializeUpload(initializeUploadURL, file);
    } catch (error) {
      this._onError(file);
      return;
    }

    const startUploadURL = initializedFileMetadata.links.content;
    const commitFileURL = initializedFileMetadata.links.commit;
    try {
      await this._doUpload(startUploadURL, file);
      const fileData = await this.finalizeUpload(commitFileURL, file);
      this.progressNotifier.onUploadCompleted(
        fileData.key,
        fileData.size,
        fileData.checksum,
        fileData.links
      );
    } catch (error) {
      console.error(error);
      const isCancelled = this.fileApiClient.isCancelled(error);
      this._onError(file, isCancelled);
    }
  };

  upload = async (initializeUploadURL, file) => {
    console.log("U", initializeUploadURL, file);
    await this._startNewUpload(initializeUploadURL, file);
  };

  delete = async (fileLinks) => {
    console.log("D", fileLinks);
    return await this.fileApiClient.deleteFile(fileLinks);
  };

  importParentRecordFiles = async (draftLinks) => {
    console.log("IPRF", draftLinks);
    const response = await this.fileApiClient.importParentRecordFiles(draftLinks);

    return response.data.entries.reduce(
      (acc, file) => ({
        ...acc,
        [file.key]: {
          //   status: UploadState.finished,
          size: file.size,
          name: file.key,
          progressPercentage: 100,
          checksum: file.checksum,
          links: file.links,
        },
      }),
      {}
    );
  };
}
