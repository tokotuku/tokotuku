import Input from "@takontuku/ui/Input.astro";

export default {
  title: "Core/Input",
  component: Input,
  args: {
    label: "Email",
    name: "email",
    placeholder: "you@example.com",
    type: "email",
  },
};

export const Default = {};

export const Required = {
  args: { required: true },
};

export const Disabled = {
  args: { disabled: true, value: "Read only example" },
};
