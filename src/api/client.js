import { DepositFileApiClient, FILE_TRANSFER_TYPE } from "@js/invenio_rdm_records";

console.log("hello from uppy world");

export class UppyDepositFileApiClient extends DepositFileApiClient {
  constructor(additionalApiConfig, defaultTransferType) {
    super(additionalApiConfig);
    this.transferType = defaultTransferType || FILE_TRANSFER_TYPE.LOCAL;
  }
}
