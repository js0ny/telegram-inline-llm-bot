import crypto from "crypto";

type QueryEntry = {
    query: string;
    ts: number;
};

const queryStore = new Map<string, QueryEntry>();
const QUERY_TTL_MS = 10 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of queryStore) {
        if (now - entry.ts > QUERY_TTL_MS) {
            queryStore.delete(id);
        }
    }
}, 60 * 1000);

export function storeQuery(query: string): string {
    const id = crypto.randomBytes(8).toString("hex");
    queryStore.set(id, { query, ts: Date.now() });
    return id;
}

export function takeQuery(queryId: string): string | null {
    const entry = queryStore.get(queryId);
    if (!entry) {
        return null;
    }

    queryStore.delete(queryId);
    return entry.query;
}
