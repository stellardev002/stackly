/** Reading list filters from a route's search params (route files pass them to the client screens as plain props). */

type Params = Record<string, string | string[] | undefined>;

export const str = (sp: Params, key: string) => {
	const v = sp[key];
	const s = Array.isArray(v) ? v[0] : v;
	return s ? s : undefined;
};

/** A value from a fixed set, or undefined (a hand-edited URL never reaches the API with a bad enum). */
export const oneOf = <T extends string>(sp: Params, key: string, allowed: readonly T[]) => {
	const v = str(sp, key);
	return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
};

export const offsetOf = (sp: Params) => {
	const n = Number(str(sp, "offset"));
	return Number.isInteger(n) && n > 0 ? n : 0;
};

export const flag = (sp: Params, key: string) => str(sp, key) === "true";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuid = (sp: Params, key: string) => {
	const v = str(sp, key);
	return v && UUID.test(v) ? v : undefined;
};
export const isUuid = (value: string) => UUID.test(value);

export const iso = (sp: Params, key: string) => {
	const v = str(sp, key);
	return v && !Number.isNaN(Date.parse(v)) ? v : undefined;
};

export const PAGE_SIZE = 20;
