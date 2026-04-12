import axios from "axios";
import { errortoast } from "../utilities/toast";

// const baseUrl = "https://sso-backend.tarchunk.win";
// const baseUrl = "http://localhost:3000";
const baseUrl = '/api'
export default class GlobalApi {
  public post = async (endpoint: string, body: any) => {
    return await fetch(`${baseUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });
  };

  public authGet = async (endpoint: string) => {
    const token = localStorage.getItem("token");
    return await fetch(`${baseUrl}/${endpoint}`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  public authPost = async (endpoint: string, body: any) => {
    const token = localStorage.getItem("token");
    return await fetch(`${baseUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body,
    });
  };

  // public uploadFile = (
  //   endpoint: string,
  //   file: File,
  //   onProgress: (percent: number) => void,
  // ) => {
  //   const token = localStorage.getItem("token");
  //   return axios.post(baseUrl + "/" + endpoint, file, {
  //     timeout: 0,
  //     headers: {
  //       "Content-Type": "application/octet-stream",
  //       ...(token ? { Authorization: `Bearer ${token}` } : {}),
  //     },
  //     onUploadProgress: (event) => {
  //       const percent = Math.round((event.loaded * 100) / (event.total || 1));
  //       onProgress(percent);
  //     },
  //   });
  // };

  public uploadFileByPresign = async (
    url: string,
    file: File,
    onProgress: (percent: number) => void,
  ) => {
    try {
      const response = await axios.put(url, file, {
        timeout: 0,
        headers: {
          "Content-Type": "application/octet-stream",
        },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / (event.total || 1));
          onProgress(percent);
        },
      });
      return response;
    } catch (error: any) {
      // 🔥 GLOBAL ERROR HANDLE
      if (error.code === "ERR_NETWORK") {
        errortoast({ text: "ไม่สามารถเชื่อมต่อกับ server ได้" });
        throw {
          type: "NETWORK",
          message: "ไม่สามารถเชื่อมต่อ server ได้",
        };
      }

      if (error.response) {
        const status = error.response.status;

        if (status === 401) {
          throw new Error("unauthorized");
        }

        if (status === 403) {
          throw new Error("forbidden");
        }

        throw new Error(error.response.data?.message || "server error");
      }

      throw new Error("unknown error");
    }
  };

  public uploadFile = async (
    endpoint: string,
    fromData: FormData,
    onProgress: (percent: number) => void,
  ) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.post(baseUrl + "/" + endpoint, fromData, {
        timeout: 0,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / (event.total || 1));
          onProgress(percent);
        },
      });

      return response.data;
    } catch (error: any) {
      // 🔥 GLOBAL ERROR HANDLE
      if (error.code === "ERR_NETWORK") {
        errortoast({ text: "ไม่สามารถเชื่อมต่อกับ server ได้" });
        throw {
          type: "NETWORK",
          message: "ไม่สามารถเชื่อมต่อ server ได้",
        };
      }

      if (error.response) {
        const status = error.response.status;

        if (status === 401) {
          throw new Error("unauthorized");
        }

        if (status === 403) {
          throw new Error("forbidden");
        }

        throw new Error(error.response.data?.message || "server error");
      }

      throw new Error("unknown error");
    }
  };

  public uploadFileSteam = async (
    endpoint: string,
    file: File,
    onProgress: (percent: number) => void,
  ) => {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.post(baseUrl + "/" + endpoint, file, {
        timeout: 0,
        headers: {
          "Content-Type": "application/octet-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / (event.total || 1));
          onProgress(percent);
        },
      });

      return response.data;
    } catch (error: any) {
      // 🔥 GLOBAL ERROR HANDLE
      if (error.code === "ERR_NETWORK") {
        errortoast({ text: "ไม่สามารถเชื่อมต่อกับ server ได้" });
        throw {
          type: "NETWORK",
          message: "ไม่สามารถเชื่อมต่อ server ได้",
        };
      }

      if (error.response) {
        const status = error.response.status;

        if (status === 401) {
          throw new Error("unauthorized");
        }

        if (status === 403) {
          throw new Error("forbidden");
        }

        throw new Error(error.response.data?.message || "server error");
      }

      throw new Error("unknown error");
    }
  };
}
