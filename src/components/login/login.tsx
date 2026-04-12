// Final cleanup
import "./login.css";
import "./login.css";
import Container from "../../utilities/container";
import { v4 as uuidv4 } from "uuid";
import { errortoast } from "../../utilities/toast";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import Input from "../../utilities/input";
import LoginService from "../../services/login.service";
interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [name, setName] = useState<string>();

  const loginService = new LoginService();
  async function signAndVerify(challenge: string, privateKey: CryptoKey) {
    // const challengeBytes = base64ToUint8Array(challenge);
    // const counter = await getAndIncrementCounter();
    const challengeBytes = base64ToUint8Array(challenge);

    const signatureBuffer = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      challengeBytes,
    );

    const signatureBase64 = arrayBufferToBase64(signatureBuffer);

    return { signature: signatureBase64 };
  }

  async function requestUuid() {
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        false, // ❗ non-exportable private key
        ["sign", "verify"],
      );
      const uuid = uuidv4();
      const publicKeyBuffer = await crypto.subtle.exportKey(
        "spki",
        keyPair.publicKey,
      );
      const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);

      const body = JSON.stringify({
        uuid,
        name,
        publicKey: publicKeyBase64,
        algorithm: "ECDSA",
      });
      const response = await loginService.login(body);

      if (response.status === 200) {
        const result = await response.json();
        // if (result?.success === false) {
        // const { signature } = await signAndVerify(
        //   result.challenge,
        //   keyPair.privateKey,
        // );
        pollToken(uuid, keyPair.privateKey, result.challenge);
        // }
      } else if (response.status === 422) {
        errortoast({ text: "test" });
      }
    } catch (error) {
      if (error instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
      } else {
        alert("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ: " + String(error));
      }
    }
  }

  async function pollToken(
    uuid: string,
    privateKey: CryptoKey,
    initialChallenge: string,
    // counter:number
  ) {
    const interval = setInterval(async () => {
      let challenge = initialChallenge;
      const { signature } = await signAndVerify(challenge, privateKey);
      console.log("challenge to sined", challenge);
      const res = await loginService.pollToken(
        JSON.stringify({ uuid, signature }),
      );
      if (!res.ok) return;

      const data = await res.json();
      console.log("datadatadata", data);

      if (data.status === "approved") {
        clearInterval(interval);
        console.log("LOGIN SUCCESS", data.token);
        localStorage.setItem("token", data.token);
        onLoginSuccess();
      } else if (data.status === "rejected") {
        clearInterval(interval);
        errortoast({ text: "Device not approved" });
      } else if (data.challenge) {
        // If not approved yet but a challenge is provided, sign it
        console.log("receive challenge", data.challenge);
        initialChallenge = data.challenge; // await signAndVerify(data.challenge, privateKey);
      }
    }, 5000);
  }

  function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }

  function base64ToUint8Array(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex p-4 bg-purple-primary/10 rounded-2xl mb-4">
            <svg
              className="w-12 h-12 text-purple-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">เข้าสู่ระบบ</h1>
          <p className="text-gray-500">กรุณากดปุ่มด้านล่างเพื่อขอ UUID</p>
        </header>

        <Container>
          <div className="space-y-4">
            <Input name="test" value={name} fn={setName}></Input>
            {/* <input
              name="ntewafsd"
              value={name}
              onChange={(event: any) => {
                console.log(event.target.value);
              }}
            ></input> */}
            <button
              className="w-full bg-purple-primary hover:bg-purple-hover text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-purple-200 transition-all active:scale-95 focus:ring-4 focus:ring-purple-200"
              onClick={requestUuid}
            >
              ขอ UUID
            </button>
            <p className="text-xs text-center text-gray-400">
              * ข้อมูลจะถูกเก็บเป็นความลับและใช้เพื่อระบุตัวตนของคุณเท่านั้น
            </p>
          </div>
        </Container>
        <Toaster position="top-center" />
      </div>
    </div>
  );
};

export default Login;
