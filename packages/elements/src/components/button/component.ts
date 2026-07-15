import { html, LitElement, unsafeCSS } from "lit";
import { tagName } from "../../constants.js";
import styles from "./component.css?raw";
import type { ButtonSize, ButtonType, ButtonVariant } from "./types.js";

export class TkButton extends LitElement {
  static override styles = unsafeCSS(styles);

  // Declared without `@property` decorators — the TC39 stage-3 decorator syntax
  // this repo otherwise standardizes on isn't parseable yet by Vite 8's default
  // Oxc-based transform (confirmed: it rejects any class/field decorator, not
  // just the `accessor` keyword), so Lit's non-decorator `static properties` API
  // is used here instead. `declare` (no initializer) is required so TypeScript
  // doesn't emit a shadowing instance field over Lit's generated accessors.
  static override properties = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    type: { type: String },
    disabled: { type: Boolean, reflect: true },
  };

  declare variant: ButtonVariant;
  declare size: ButtonSize;
  declare type: ButtonType;
  declare disabled: boolean;

  constructor() {
    super();
    this.variant = "primary";
    this.size = "md";
    this.type = "button";
    this.disabled = false;
  }

  protected override render() {
    return html`
      <button part="button" type=${this.type} ?disabled=${this.disabled}>
        <slot></slot>
      </button>
    `;
  }
}

customElements.define(tagName("button"), TkButton);

declare global {
  interface HTMLElementTagNameMap {
    "tk-button": TkButton;
  }
}
