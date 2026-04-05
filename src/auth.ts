import { allowedUserIds } from "./config";

export function isAllowedUser(userId: number): boolean {
    if (allowedUserIds.size === 0) {
        return true;
    }

    return allowedUserIds.has(String(userId));
}
