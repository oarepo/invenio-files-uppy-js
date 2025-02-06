/*
 * This file is part of Invenio-Files-Uppy-Js.
 * Copyright (C) 2025 CERN.
 * Copyright (C) 2025 CESNET.
 *
 * Invenio-Files-Uppy-Js is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */
import { DepositFileApiClient, FILE_TRANSFER_TYPE } from "@js/invenio_rdm_records";

export class UppyDepositFileApiClient extends DepositFileApiClient {
  constructor(additionalApiConfig, defaultTransferType) {
    super(additionalApiConfig);
    this.transferType = defaultTransferType || FILE_TRANSFER_TYPE.LOCAL;
  }
}
