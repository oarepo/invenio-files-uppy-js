/*
 * This file is part of Invenio-Files-Uppy-Js.
 * Copyright (C) 2025 CERN.
 * Copyright (C) 2025 CESNET.
 *
 * Invenio-Files-Uppy-Js is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */
import { DepositFileApiClient } from "@js/invenio_rdm_records";

export class UnsupportedTransferTypeError extends Error {
  file;
  transferType;
  supportedTypes;
  isUserFacing;

  constructor(message, opts) {
    super(message);
    this.isUserFacing = opts?.isUserFacing ?? false;
    if (opts?.file) {
      this.file = opts.file;
    }
    if (opts?.transferType) {
      this.transferType = opts.transferType;
    }
    if (opts?.supportedTypes) {
      this.supportedTypes = opts.supportedTypes;
    }
  }
}

export class UppyDepositFileApiClient extends DepositFileApiClient {
  constructor(additionalApiConfig, defaultTransferType, transferTypes) {
    super(additionalApiConfig);
    this.defaultTransferType = defaultTransferType || "L";
    this.transferTypes = transferTypes || ["L"];
  }

  initializeFileUpload(initializeUploadUrl, filename, transferOptions) {
    console.log("IFU", initializeUploadUrl, filename, transferOptions);

    const { fileSize, type: transferType, ...opts } = transferOptions;

    if (!this.transferTypes.includes(transferType)) {
      throw new UnsupportedTransferTypeError(
        `Unsupported upload TransferType "${transferType}". Server supports: ${this.transferTypes}`,
        { filename, transferType, supportedTypes: this.transferTypes }
      );
    }

    const payload = [
      {
        key: filename,
        size: fileSize,
        transfer: {
          type: transferType || this.defaultTransferType,
          ...opts,
        },
      },
    ];
    return this.axiosWithConfig.post(initializeUploadUrl, payload, {});
  }

  finalizeFileUpload(finalizeUploadUrl) {
    return this.axiosWithConfig.post(finalizeUploadUrl, {});
  }

  deleteFile(fileLinks, options) {
    return this.axiosWithConfig.delete(fileLinks.self, options);
  }
}
