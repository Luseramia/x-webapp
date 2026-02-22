import toast, { Toaster } from "react-hot-toast";

export function errortoast({ text }: { text: string }) {
  toast(text, {
    duration: 4000,
    icon: "🔥",
    style:{
      background:'red',
      color:'white'
    }
  });
}
