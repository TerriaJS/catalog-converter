import { DEFAULT_ID_LENGTH } from "./converters/generateRandomId";
import { CatalogMember } from "./types";

export interface ConversionOptions {
  readonly copyUnknownProperties: boolean;
  readonly partial: boolean;
  readonly generateIds: boolean;
  readonly idLength: number;
  // An optional accumulator for collecting all is enabled items in the catalog
  readonly enabledItemsAccumulator: CatalogMember[] | undefined;
  readonly addv7autoIdShareKeys: boolean;
}

export const defaultConversionOptions: ConversionOptions = {
  copyUnknownProperties: false,
  partial: false,
  addv7autoIdShareKeys: true,
  generateIds: true,
  enabledItemsAccumulator: undefined,
  idLength: DEFAULT_ID_LENGTH,
};

export function defaultOptions(
  options: Partial<ConversionOptions> | undefined
) {
  return Object.assign({}, defaultConversionOptions, options || {});
}
