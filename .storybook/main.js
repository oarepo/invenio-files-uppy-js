import { resolve } from "path";

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: ["../src/**/*.mdx", "../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-storysource"
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    disableTelemetry: true
  },
  async viteFinal(config) {
    const rollupConfig = (await import('../rollup.config.js')).default;

    if (!config.build) {
      config.build = {};
    }
    config.build.rollupOptions = rollupConfig.default.default

    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve?.alias,
        // 👇 Mock aliased Invenio modules
        '@js/invenio_rdm_records': resolve(__dirname, './__mocks__/@js/invenio_rdm_records.jsx'),
      };
    }

    return config;
  },
  build: {
    test: {
      disabledAddons: [
        "@storybook/addon-docs",
        "@storybook/addon-essentials/docs",
      ],
    },
  },
};
export default config;
