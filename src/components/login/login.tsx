import { useState } from "react";
import "./login.css";
import Col from "../../utilities/row-col";
import toast, { Toaster } from "react-hot-toast";
import Container from "../../utilities/container";
import { v4 as uuidv4 } from "uuid";
import { errortoast } from "../../utilities/toast";
import type { Buffer } from "buffer";
// import type { Buffer } from "buffer";
function Login() {
  const [uuid, setUuid] = useState();
  // const baseUrl = "https://sso-backend.tarchunk.win";
  const baseUrl = "http://localhost:3000";
  async function signAndVerify(challenge: string, privateKey: CryptoKey) {
    const challengeBytes = base64ToUint8Array(challenge);
    // const counter = await getAndIncrementCounter();
    const payload = buildPayload(challengeBytes);

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
        publicKey: publicKeyBase64,
        algorithm: "ECDSA",
      });
      const response = await fetch(`${baseUrl}/sso/register-uuid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body,
      });

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
      const res = await fetch(`${baseUrl}/sso/poll-jwt/v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uuid, signature }),
      });
      if (!res.ok) return;

      const data = await res.json();
      console.log('datadatadata',data);
      
      if (data.status === "approved") {
        clearInterval(interval);
        console.log("LOGIN SUCCESS", data.token);
        localStorage.setItem("token", data.token);
      } else if (data.status === "rejected") {
        clearInterval(interval);
        errortoast({ text: "Device not approved" });
      } else if (data.challenge) {
        // If not approved yet but a challenge is provided, sign it
        console.log('receive challenge',data.challenge);
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

  async function getAndIncrementCounter() {
    const key = "sign-counter";
    const current = Number(localStorage.getItem(key) || 0);
    const next: number = current + 1;
    localStorage.setItem(key, next.toString());
    return next;
  }

  function buildPayload(challengeBytes: Uint8Array<ArrayBuffer>) {
    const payload = new Uint8Array(challengeBytes.length);

    // payload.set(challengeBytes, 0);
    // payload.set(challengeBytes.length);

    return payload;
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold underline">Hello world!</h1>
        <Container>
          <button
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 border rounded-md outline w-xl"
            onClick={requestUuid}
          >
            test
          </button>
        </Container>
        <Toaster />
      </div>
    </>
  );
}

export default Login;
