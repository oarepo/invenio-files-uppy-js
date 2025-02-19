// TODO: If WASM undesirable, we can use something like Crypto-JS?
import { md5 } from "hash-wasm";
import AwsS3Multipart from "@uppy/aws-s3-multipart";
import { fetcher } from "@uppy/utils/lib/fetcher";

import { humanReadableBytes } from "react-invenio-forms";

import { FileSizeError, InvalidPartNumberError, SignedUrlExpiredError } from "./error";

const defaultOptions = {
  // TODO: null here means “include all”, [] means include none.
  // This is inconsistent with @uppy/aws-s3 and @uppy/transloadit
  allowedMetaFields: null,
  limit: 6,
  getTemporarySecurityCredentials: false,
  getUploadParameters: null,
  shouldUseMultipart: null,
  retryDelays: [0, 1000, 3000, 5000],
  companionHeaders: {},
  uploadFiles: () => {},
  checkPartIntegrity: false,
};

export class InvenioMultipartUploader extends AwsS3Multipart {
  static VERSION = "0.0.1";
  #maxMultipartParts = 10_000;

  constructor(uppy, opts) {
    super(uppy, {
      ...defaultOptions,
      fieldName: opts.bundle ? "files[]" : "file",
      ...opts,
    });
    this.type = "uploader";
    this.id = this.opts.id || "InvenioMultipartUpload";
    this.getChunkSize = opts.getChunkSize || this.getChunkSize;
    this.shouldUseMultipart = this.opts.shouldUseMultipart || this.shouldUseMultipart;
    this.i18nInit();
    super.setOptions({
      // Here we override default implementation in AwsS3Multipart
      shouldUseMultipart: this.shouldUseMultipart.bind(this),
    });
  }

  install() {
    AwsS3Multipart.prototype.install.apply(this);
    // Disable resumable uploads Uppy capability.
    // Currently unsupported, as it requires missing API
    // implementation for the `listParts` method.
    this.#setResumableUploadsCapability(false);
  }

  #setResumableUploadsCapability = (boolean) => {
    const { capabilities } = this.uppy.getState();
    this.uppy.setState({
      capabilities: {
        ...capabilities,
        resumableUploads: boolean,
      },
    });
  };

  #getFetcher = (file) => {
    return async (url, options) => {
      try {
        const res = await fetcher(url, {
          ...options,
          shouldRetry: this.opts.shouldRetry,
          onTimeout: (timeout) => {
            const seconds = Math.ceil(timeout / 1000);
            const error = new Error(this.i18n("uploadStalled", { seconds }));
            this.uppy.emit("upload-stalled", error, [file]);
          },
        });

        const body = JSON.parse(res.responseText);
        return body;
      } catch (error) {
        if (error.name === "AbortError") {
          return undefined;
        }
        const request = error.request;
        this.uppy.emit("upload-error", this.uppy.getFile(file.id), error, request);

        throw error;
      }
    };
  };

  async #getPartDigest(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const digest = await md5(new Uint8Array(arrayBuffer));
    return digest;
  }

  /**
   * A boolean, or a function that returns a boolean which is called for each file that is uploaded with the corresponding UppyFile instance as argument.
   *
   * By default, all files with a file.size ≤ getChunkSize will be uploaded in a single chunk, all files larger than that as multipart.
   * @param {*} file the file object from Uppy’s state. The most relevant keys are file.name and file.type
   */
  shouldUseMultipart(file) {
    const chunkSize = this.getChunkSize(file);
    const partCount = Math.ceil(file.size / chunkSize);
    console.log("SUM", partCount > 1);

    return partCount > 1;
  }

  /**
   * A function that will be called for each non-multipart upload.
   * @param {*} file the file object from Uppy’s state. The most relevant keys are file.name and file.type
   * @param {*} options object: signal: AbortSignal
   */
  getUploadParameters(file, options) {
    // TODO: implement for single local transfer type uploads
  }

  /**
   * A function that returns the minimum chunk size to use when uploading the given file as multipart.
   * For multipart uploads, chunks are sent in batches to have presigned URLs generated with signPart(). To reduce the amount of requests for large files, you can choose a larger chunk size, at the cost of having to re-upload more data if one chunk fails to upload.
   * S3 requires a minimum chunk size of 5MiB, and supports at most 10,000 chunks per multipart upload. If getChunkSize() returns a size that’s too small, Uppy will increase it to S3’s minimum requirements.
   * Default implementation produces a chunk size between 5-250 MB for max. 10240 chunks (max filesize. ~2.44 TiB).
   * @param {*} file the file object from Uppy’s state. The most relevant keys are file.name and file.type
   * @returns
   */
  getChunkSize(file) {
    console.log("GCS", file);
    const MiB = 1024 * 1024;
    const minPartSize = MiB * 5;
    const midPartSize = MiB * 25;
    const maxPartSize = MiB * 250;

    const smallFile = file.size <= this.#maxMultipartParts * minPartSize;
    const mediumFile = file.size <= this.#maxMultipartParts * midPartSize;
    const largeFile = file.size <= this.#maxMultipartParts * maxPartSize;

    const chunkSize = smallFile
      ? minPartSize
      : mediumFile
      ? midPartSize
      : largeFile
      ? maxPartSize
      : undefined;

    if (chunkSize === undefined) {
      throw new FileSizeError(
        this.i18n("exceedsSize", {
          size: humanReadableBytes(maxPartSize * this.#maxMultipartParts),
          file: file.name ?? this.getI18n()("unnamed"),
        }),
        { file }
      );
    }
    return chunkSize;
  }

  /**
   * A function that calls the S3 Multipart API to create a new upload.
   * @param {*} file the file object from Uppy’s state. The most relevant keys are file.name and file.type
   * @returns a Promise for an object with keys:
   *   - uploadId - The UploadID returned by S3.
   *   - key - The object key for the file. This needs to be returned to allow it to be different from the file.name.
   */
  async createMultipartUpload(file) {
    const chunkSize = this.getChunkSize(file);

    file.transferOptions = {
      fileSize: file.size,
      parts: Math.ceil(file.size / chunkSize),
      part_size: chunkSize,
    };

    const response = await this.opts.initializeUpload(file);

    // Map any links to Uppy file object state for further use (e.g. to fetch signed part URLs)
    file.links = response.links;
    file.file_id = response.file_id;

    return { uploadId: file.file_id, key: response.key };
  }

  /**
   * A function that obtains a signed upload URL for the specified part number.
   * @param {*} file the file object from Uppy’s state. The most relevant keys are file.name and file.type
   * @param {*} partData an object with the keys:
   *   - uploadId - The UploadID of this Multipart upload.
   *   - key - The object key in the S3 bucket.
   *   - partNumber - can’t be zero.
   *   - body – The data that will be signed.
   *   - signal – An AbortSignal that may be used to abort an ongoing request.
   * @returns This function should return a object, or a promise that resolves to an object, with the following keys:
   *   - url – the presigned URL, as a string.
   *   - headers – (Optional) Custom headers to send along with the request to S3 endpoint.
   */
  async signPart(file, partData) {
    const { partNumber, signal, body } = partData;
    const signedPartUrls = file.links.parts;

    const headers = {};

    if (this.opts.checkPartIntegrity) {
      const contentMd5 = await this.#getPartDigest(body);
      headers["Content-MD5"] = contentMd5;
    }

    if (partNumber < 1 || partNumber > signedPartUrls.length) {
      throw new InvalidPartNumberError(
        this.i18n("invalidPartNumber", {
          partNumber: partNumber,
          file: file.name ?? this.getI18n()("unnamed"),
        }),
        { file, partNumber }
      );
    }

    const { expiration, url } = signedPartUrls.find(({ part }) => part === partNumber);

    const expiryDate = new Date(expiration);
    const now = new Date();
    if (now > expiryDate) {
      const fetch = this.#getFetcher(file, { signal });
      // Re-fetching file metadata will re-generate signed part URLs
      const fileMetadata = await fetch(file.links.self);
      file.links = fileMetadata.links;

      // Throw an error to let Uppy retry with fresh state
      throw new SignedUrlExpiredError(
        this.i18n("signedUrlExpired", {
          partNumber: partNumber,
          file: file.name ?? this.getI18n()("unnamed"),
        }),
        { file, partNumber }
      );
    }

    return { url, headers };
  }

  /**
   * A function that calls the S3 Multipart API to complete a Multipart upload, combining all parts into a single object in the S3 bucket.
   * @param {*} file the file object from Uppy’s state. The most relevant keys are file.name and file.type
   * @param {*}  params an object with keys:
   *   - uploadId - The UploadID of this Multipart upload.
   *   - key - The object key of this Multipart upload.
   *   - parts - S3-style list of parts, an array of objects with ETag and PartNumber properties. This can be passed straight to S3’s Multipart API.
   * @returns a Promise for an object with properties:
   *  - location - (Optional) A publicly accessible URL to the object in the S3 bucket.
   *  - The default implementation calls out to Companion’s S3 signing endpoints.
   */
  async completeMultipartUpload(file, { uploadId, key, parts }) {
    const response = await this.opts.finalizeUpload(file);
    return response.links.content;
  }

  /**
   * A function that calls the S3 Multipart API to abort a Multipart upload,
   * and removes all parts that have been uploaded so far.
   */
  async abortMultipartUpload(file, { uploadId, key }) {
    await this.opts.abortUpload(file, uploadId);
  }
}
