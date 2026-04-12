import GlobalApi from "./global.api";

export default class LoginService {
  globalApi = new GlobalApi();
  async login(body: any) {
    return await this.globalApi.post("sso/register-uuid", body);
  }

  async pollToken(body: any) {
    return await this.globalApi.post("sso/poll-jwt/v2", body);
  }
}
