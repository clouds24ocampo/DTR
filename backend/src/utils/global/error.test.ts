import { ServiceError, asyncHandler, errorHandler } from "./error";

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("errorHandler", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it("passes ServiceError status and message through", () => {
    const res = mockRes();
    errorHandler(new ServiceError("Not yours", 403), {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Not yours" });
  });

  it("hides unexpected error details", () => {
    const res = mockRes();
    errorHandler(new Error("db password leaked"), {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
  });

  it("maps duplicate keys to 409", () => {
    const res = mockRes();
    errorHandler({ code: 11000 }, {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe("asyncHandler", () => {
  it("forwards rejections to next()", async () => {
    const next = jest.fn();
    const err = new ServiceError("boom", 400);
    asyncHandler(async () => {
      throw err;
    })({} as any, {} as any, next);
    await new Promise((r) => setImmediate(r));
    expect(next).toHaveBeenCalledWith(err);
  });
});
