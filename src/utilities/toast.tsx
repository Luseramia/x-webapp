import toast from "react-hot-toast";

export function errortoast({ text }: { text: string }) {
  toast(text, {
    duration: 4000,
    icon: "🔥",
    style: {
      background: "red",
      color: "white",
    },
  });
}

export function successtoast({ text }: { text: string }) {
  toast(text, {
    duration: 3000,
    icon: "✅",
    style: {
      background: "#16a34a",
      color: "white",
    },
  });
}

export function warntoast({ text }: { text: string }) {
  toast(text, {
    duration: 3000,
    icon: "⚠️",
    style: {
      background: "#f59e0b",
      color: "white",
    },
  });
}
