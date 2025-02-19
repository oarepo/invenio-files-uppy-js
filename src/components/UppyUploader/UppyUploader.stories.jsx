import * as React from "react";
import { BaseForm } from "react-invenio-forms";
import { UppyUploaderComponent } from "./UppyUploader";
import { fn, userEvent, expect, fireEvent } from "@storybook/test";
import mockFileForUpload from "./__mocks__/fixtures/aman-pal-1c2iHG5_MgE-unsplash.jpg";

const mockDraftRecordMetadata = {
  metadata: {
    publication_date: "2025-02-19",
    publisher: "rdm-dev",
    rights: [],
    title: "",
    additional_titles: [],
    additional_descriptions: [],
    creators: [],
    contributors: [],
    resource_type: "",
    dates: [],
    languages: [],
    identifiers: [],
    related_identifiers: [],
    references: [],
    subjects: [],
    funding: [],
    version: "",
  },
  files: {
    enabled: true,
  },
  status: "draft",
  expanded: {},
  pids: {},
  access: {
    record: "public",
    files: "public",
  },
};
const mockErrors = [];

const mockFilesForUpload = [
  { name: "example.txt", size: 1024, lastModified: Date.now() },
];

const meta = {
  title: "UppyUploaderComponent",
  component: UppyUploaderComponent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "90vw", height: "100%" }}>
        <BaseForm
          // onSubmit={this.onFormSubmit}
          formik={{
            // enableReinitialise needed due to
            // updated draft PID (and the endpoint URL as a consequence).
            // After saving draft for the first time, a new PID is obtained,
            // initial values need to be updated with draft record containing
            // the new PID in its payload, otherwise a new PID
            // is requested on each action, generating countless drafts
            enableReinitialize: true,
            initialValues: mockDraftRecordMetadata,
            // errors need to be repopulated after form is reinitialised
            ...(mockErrors && { initialErrors: mockErrors }),
          }}
        >
          <Story />
        </BaseForm>
      </div>
    ),
  ],
};

export default meta;

export const Default = {
  args: {
    uploadFiles: fn(),
    initializeFileUpload: fn(),
    finalizeUpload: fn(),
    deleteFile: fn(),
    importParentFiles: fn(),
  },
  play: async ({ canvasElement }) => {
    const uppyRoot = canvasElement.getElementsByClassName("uppy-Root")[0];

    await expect(uppyRoot).toBeInTheDocument();
  },
};

export const SingleUpload = {
  ...Default,
  play: async ({ canvasElement }) => {
    const dropZone = canvasElement.getElementsByClassName("uppy-Dashboard-AddFiles")[0];
    const dropZoneInput =
      canvasElement.getElementsByClassName("uppy-Dashboard-input")[0];
    await expect(dropZone).toBeInTheDocument();
    await expect(dropZoneInput).toBeInTheDocument();

    const mockFileContent = await fetch(mockFileForUpload).then((r) => r.blob());

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File([mockFileContent], "mock.jpg", { type: "image/jpeg" })
    );
    // mockFilesForUpload.forEach((file) => {
    //   dataTransfer.items.add(
    //     new File([mockFileContent], file.name, { type: "image/jpeg" })
    //   );
    // });

    // fireEvent.dragOver(dropZone, { dataTransfer });
    await new Promise((resolve) => setTimeout(resolve, 200));
    fireEvent.drop(dropZone, {
      dataTransfer,
    });
  },
};
