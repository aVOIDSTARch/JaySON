/**
 * HTTP Client - Network utilities for fetching remote resources
 */

import * as https from "https";
import * as http from "http";

/**
 * Fetch content from a URL with redirect handling
 */
export function fetchUrl(url: string, timeout: number = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : http;

        const request = protocol.get(url, (response) => {
            // Handle redirects
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                fetchUrl(response.headers.location, timeout)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode && response.statusCode >= 400) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            let data = "";
            response.on("data", (chunk) => {
                data += chunk;
            });
            response.on("end", () => {
                resolve(data);
            });
            response.on("error", reject);
        });

        request.on("error", reject);
        request.setTimeout(timeout, () => {
            request.destroy();
            reject(new Error("Request timeout"));
        });
    });
}

/**
 * Check if internet is available by pinging a known endpoint
 */
export async function checkInternetAccess(testUrl: string = "https://json-schema.org", timeout: number = 5000): Promise<boolean> {
    try {
        await fetchUrl(testUrl, timeout);
        return true;
    } catch {
        return false;
    }
}
