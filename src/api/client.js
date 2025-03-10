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

  /**
   * This method is required by Uppy to do single-part small file uploads.
   * These uploads are managed through a simple XHRHttpRequest-based upload request,
   * and thus cannot reuse current axiosWithConfig instance to make the request.
   *
   * @param {*} fileContentUrl link to upload the file data to
   * @param {*} file Uppy file metadata
   * @param {*} options extra request options
   * @returns
   */
  getUploadParams = async (fileContentUrl, file, options) => {
    console.log("GUP", fileContentUrl, file, options);

    const axiosDefaults = this.axiosWithConfig.defaults;

    // Extract headers, ensuring they are merged properly
    const xhrHeaders = {
      ...axiosDefaults.headers.common, // Common headers like Authorization
    };

    if (axiosDefaults.xsrfCookieName && axiosDefaults.xsrfHeaderName) {
      /**
       * Ensure CSRF headers are included
       * TODO: Kinda ugly manual parsing. We can instead consider using:
       * import Cookies from "js-cookie";
       * const csrfToken = Cookies.get("csrftoken");
       */
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${axiosDefaults.xsrfCookieName}=`))
        ?.split("=")[1];

      if (csrfToken) {
        xhrHeaders[axiosDefaults.xsrfHeaderName] = csrfToken;
      }
    }

    const resp = {
      method: "PUT",
      url: fileContentUrl,
      headers: {
        ...xhrHeaders,
        // The following is hard-coded into drafts files resource
        "Content-Type": "application/octet-stream",
      },
    };
    return resp;
  };
}
