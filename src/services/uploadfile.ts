import type { Dispatch, SetStateAction } from "react";
import GlobalApi from "./global.api";
import type { PresignModel } from "../models/presign.model";
import type { requestPresignBodyModel } from "../models/file.model";

export default class UploadFileService {
  globalApi = new GlobalApi();



  async putByPresign(
    url: string,
    file: File,
    fn: Dispatch<SetStateAction<any>>,
  ) {
    return await this.globalApi.uploadFileByPresign(url, file, fn);
  }



  async getUploadPresignUrl(body: string) {
    return await this.globalApi.authPost("file/upload/presign", body);
  }



  async getDowloadPresignUrl(body: string) {
    return await this.globalApi.authPost("file/dowload/presign", body);
  }


  async getAllThumnail() {
    return await this.globalApi.authGet("file/all/thumnail");
  }


  async uploadFile(file: FormData, fn: Dispatch<SetStateAction<any>>) {
    return await this.globalApi.uploadFile("file/upload/v2", file, fn);
  }
  async uploadFileSteam(file: File, fn: Dispatch<SetStateAction<any>>) {
    return await this.globalApi.uploadFileSteam("file/upload", file, fn);
  }
}
