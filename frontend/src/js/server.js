export const HOST = "http://localhost:5000";

export async function GET(endpoint, requestParameters) {
    return await fetch(HOST + endpoint + "?" + requestParameters);
}

export async function POST(endpoint, requestParameters, bodyJSON) {
    if (requestParameters) {
        return await fetch(HOST + endpoint + "?" + requestParameters, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyJSON)
        });
    } else {
        return await fetch(HOST + endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyJSON)
        });
    }
}
