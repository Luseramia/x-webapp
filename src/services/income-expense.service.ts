import type { Dispatch, SetStateAction } from "react";
import GlobalApi from "./global.api";

export default class IncomeExpenseService {
  globalApi = new GlobalApi();

  async uploadOcrBatch(file: FormData, fn: Dispatch<SetStateAction<any>>) {
    return await this.globalApi.authPost("ocr/batch", file);
  }
}
