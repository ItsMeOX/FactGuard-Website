import { GET } from "@/app/api/health/route";

beforeEach(() => {
  jest.clearAllMocks();
});

function makeGetRequest(): Request {
  return new Request("http://localhost/api/health", { method: "GET" });
}

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: "ok" });
  });
});
