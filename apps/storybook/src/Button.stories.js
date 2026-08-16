import Button from "@takontuku/ui/Button.astro";

export default {
  title: "Core/Button",
  component: Button,
  args: {
    slots: { default: "Save changes" },
  },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
};

export const Primary = {
  args: { variant: "primary", size: "md" },
};

export const Secondary = {
  args: { variant: "secondary" },
};

export const Ghost = {
  args: { variant: "ghost" },
};

export const Disabled = {
  args: { disabled: true },
};
