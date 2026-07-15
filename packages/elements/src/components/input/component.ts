import { html, LitElement, unsafeCSS } from "lit";
import { tagName } from "../../constants.js";
import styles from "./component.css?raw";
import { TkChangeEvent } from "./events.js";
import type { InputType } from "./types.js";

export class TkInput extends LitElement {
  static override styles = unsafeCSS(styles);

  // No `@property` decorators — see the comment in ../button/component.ts for why.
  static override properties = {
    label: { type: String },
    type: { type: String },
    name: { type: String },
    value: { type: String },
    placeholder: { type: String },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  declare label: string;
  declare type: InputType;
  declare name: string;
  declare value: string;
  declare placeholder: string;
  declare required: boolean;
  declare disabled: boolean;

  constructor() {
    super();
    this.label = "";
    this.type = "text";
    this.name = "";
    this.value = "";
    this.placeholder = "";
    this.required = false;
    this.disabled = false;
  }

  private handleInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.dispatchEvent(new TkChangeEvent({ value: this.value }));
  }

  override focus(): void {
    this.shadowRoot?.querySelector("input")?.focus();
  }

  protected override render() {
    return html`
      ${this.label ? html`<label part="label" for="input">${this.label}</label>` : null}
      <input
        part="input"
        id="input"
        type=${this.type}
        name=${this.name}
        .value=${this.value}
        placeholder=${this.placeholder}
        ?required=${this.required}
        ?disabled=${this.disabled}
        @input=${this.handleInput}
      />
    `;
  }
}

customElements.define(tagName("input"), TkInput);

declare global {
  interface HTMLElementTagNameMap {
    "tk-input": TkInput;
  }
}
