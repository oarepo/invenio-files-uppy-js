/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: "^on.*" },
    docs: {
      toc: true,
    },
  },
  tags: ['autodocs'],
};

export default preview;
