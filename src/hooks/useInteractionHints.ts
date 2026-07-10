import { useCallback, useEffect, useRef, useState } from "react";

type HintKey = "clicked" | "move_field" | "scrolled";

export interface UserActions {
  clicked: boolean;
  dragged: boolean;
  keyed: boolean;
  scrolled: boolean;
  move_field: boolean;
}

const HINT_INITIAL_DELAY = 5000; // 最初のヒントが表示されるまでの時間
const HINT_DISPLAY_DURATION = 7000; // 各ヒントが表示される時間

const hintMessagesMap: Record<HintKey, string> = {
  clicked: "輝いている石をクリックして展開",
  move_field: "ドラッグでフィールドを移動",
  scrolled: "スクロールでズーム",
};
const hintOrder: HintKey[] = ["clicked", "move_field", "scrolled"];

export const useInteractionHints = () => {
  const [userActions, setUserActions] = useState<UserActions>({
    clicked: false,
    dragged: false,
    keyed: false,
    scrolled: false,
    move_field: false,
  });

  const [currentHintMessage, setCurrentHintMessage] = useState<string | null>(
    null,
  );
  const [isFadingOut, setIsFadingOut] = useState(false); // フェードアウト中かどうかのフラグ
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintSequenceIndexRef = useRef(0);

  // コンポーネント側からユーザーのアクションを登録するための関数
  const registerAction = useCallback((actionUpdate: Partial<UserActions>) => {
    setUserActions((prev) => ({ ...prev, ...actionUpdate }));
  }, []);

  useEffect(() => {
    const showNextHintInSequence = () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }

      let nextHintKey: HintKey | null = null;
      const startIndex = hintSequenceIndexRef.current;

      for (let i = 0; i < hintOrder.length; i++) {
        const checkIndex = (startIndex + i) % hintOrder.length;
        const key = hintOrder[checkIndex];
        if (key === "move_field") {
          if (!userActions.move_field) {
            nextHintKey = key;
            hintSequenceIndexRef.current = checkIndex;
            break;
          }
        } else {
          if (!userActions[key]) {
            nextHintKey = key;
            hintSequenceIndexRef.current = checkIndex;
            break;
          }
        }
      }

      if (nextHintKey) {
        setCurrentHintMessage(hintMessagesMap[nextHintKey]);
        setIsFadingOut(false);

        hintTimerRef.current = setTimeout(() => {
          const actionPerformed =
            nextHintKey === "move_field"
              ? userActions.move_field
              : userActions[nextHintKey!];
          if (!actionPerformed) {
            setIsFadingOut(true);
            setTimeout(() => {
              hintSequenceIndexRef.current =
                (hintSequenceIndexRef.current + 1) % hintOrder.length;
              showNextHintInSequence();
            }, 500);
          } else {
            setCurrentHintMessage(null);
            setIsFadingOut(false);
            showNextHintInSequence();
          }
        }, HINT_DISPLAY_DURATION);
      } else {
        setCurrentHintMessage(null);
        setIsFadingOut(false);
        hintSequenceIndexRef.current = 0;
      }
    };

    if (
      Object.values(userActions).every((action) => !action) &&
      currentHintMessage === null
    ) {
      hintTimerRef.current = setTimeout(
        showNextHintInSequence,
        HINT_INITIAL_DELAY,
      );
    } else if (Object.values(userActions).some((action) => action)) {
      showNextHintInSequence();
    }

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [userActions, currentHintMessage]); // userActions や currentHintMessage が変更されるたびにシーケンスを再評価

  return {
    currentHintMessage,
    isFadingOut,
    registerAction,
  };
};
