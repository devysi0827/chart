import { useEffect, useRef, useState, useCallback } from "react";
import styled from "styled-components";
import { colors, opacityVars } from "Assets/Text";
import { Coordinate } from "Assets/Type";

export default function Canvas() {
  // canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const ctx = canvasRef.current?.getContext("2d");

  const [canvasSwitch, setCanvasSwitch] = useState(false);
  const [lineSettingSwitch, setLineSettingSwitch] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [mousePosition, setMousePosition] = useState<Coordinate>({
    x: -1,
    y: -1,
  });

  // undo, redo layer
  const [layer, setLayer] = useState<ImageData[]>([]);
  const [layerIndex, setLayerIndex] = useState(0);

  // pen value
  const [lineColor, setLineColor] = useState<string>("#f80000");
  const [lineWidth, setLineWidth] = useState<number>(10);
  const [opacity, setOpacity] = useState<number>(10);

  // erase value
  const [isErase, setIsErase] = useState<boolean>(false);
  // const [eraseSize, setEraseSize] = useState<number>(10);

  const getCoordinate = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => ({ x: e.clientX, y: e.clientY });

  const drawLine = useCallback(
    (originalMousePosition: Coordinate, newMousePosition: Coordinate) => {
      if (!ctx) return;

      // 펜 설정
      ctx.strokeStyle = lineColor + opacityVars[opacity];
      ctx.lineJoin = "round";
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(originalMousePosition.x, originalMousePosition.y);
      ctx.lineTo(newMousePosition.x, newMousePosition.y);
      ctx.closePath();
      ctx.stroke();
    },
    [ctx, lineColor, lineWidth, opacity]
  );

  const eraseLine = useCallback(
    (originalMousePosition: Coordinate) => {
      if (!ctx) return;
      ctx.clearRect(originalMousePosition.x, originalMousePosition.y, 20, 20);
    },
    [ctx]
  );

  const startPaint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
      const coordinate = getCoordinate(e);
      if (coordinate) {
        setIsPainting(true);
        setMousePosition(coordinate);
      }
    },
    []
  );

  const paint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isPainting || !mousePosition) return;
      const newMousePosition = getCoordinate(e);
      if (!newMousePosition) return;
      if (isErase) {
        eraseLine(mousePosition);
        setMousePosition(newMousePosition);
      } else {
        drawLine(mousePosition, newMousePosition);
        setMousePosition(newMousePosition);
      }
    },
    [isPainting, mousePosition, drawLine, eraseLine, isErase]
  );

  const stopPaint = useCallback(() => {
    if (!ctx) return;
    setIsPainting(false);
    const imageData = ctx.getImageData(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );
    if (layerIndex !== layer.length) {
      setLayer([...layer.slice(0, layerIndex), imageData]);
    } else {
      setLayer([...layer, imageData]);
    }
    setLayerIndex((x) => x + 1);
  }, [ctx, layer, layerIndex]);

  const clearCanvas = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    setLayer([]);
    setLayerIndex(0);
  };

  const undoCanvas = () => {
    if (layerIndex <= 0 || !ctx) return;
    if (layerIndex === 1) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      setLayerIndex((x) => x - 1);
    }
    if (layerIndex !== 1) {
      ctx.putImageData(layer[layerIndex - 2], 0, 0);
      setLayerIndex((x) => x - 1);
    }
  };

  const redoCanvas = () => {
    if (layerIndex === layer.length || !ctx) return;
    ctx.putImageData(layer[layerIndex], 0, 0);
    setLayerIndex((x) => x + 1);
  };

  // const
  const toolMenus = [
    { text: "뒤로", function: () => undoCanvas() },
    { text: "앞으로", function: () => redoCanvas() },
    { text: "", function: () => {} },
    {
      text: "그리기설정",
      function: () => {
        setLineSettingSwitch(!lineSettingSwitch);
      },
    },
    { text: "일자그리기", function: () => {} },
    { text: "지우개", function: () => setIsErase(!isErase) },
    { text: "초기화", function: () => clearCanvas() },
    { text: "", function: () => {} },
    { text: "저장", function: () => {} },
  ];

  useEffect(() => {
    const previewCtx = previewRef.current?.getContext("2d");
    if (previewCtx) {
      previewCtx.strokeStyle = lineColor + opacityVars[opacity];
      previewCtx.lineJoin = "round";
      previewCtx.lineWidth = lineWidth;
      previewCtx.arc(150, 75, 25, 45, Math.PI + 45, false);
      previewCtx.stroke();
    }
    return () => {
      previewCtx?.arc(150, 75, 25, Math.PI + 45, 45, true);
      previewCtx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [lineColor, lineWidth, opacity, lineSettingSwitch]);

  return (
    <>
      <Container>
        <Menu className="menu">
          <div
            className="menu--select-none"
            onClick={() => setCanvasSwitch(!canvasSwitch)}
          >
            switch
          </div>
          <div className="menu-group">
            {toolMenus.map((info, idx) =>
              info.text === "" ? (
                <div key={info + idx.toString()} className="menu__line" />
              ) : (
                <div
                  key={info + idx.toString()}
                  className="menu--select-none"
                  onClick={info.function}
                >
                  {info.text}
                </div>
              )
            )}
          </div>
        </Menu>

        {lineSettingSwitch && (
          <Column>
            <Flex>
              <div>자유롭게 쓰기</div>
              <div onClick={() => setLineSettingSwitch(!lineSettingSwitch)}>
                닫기
              </div>
            </Flex>
            <div>미리보기</div>
            <PreviewCanvas ref={previewRef} />
            <div>밝기 : {opacity}</div>
            <div>
              <input
                type="range"
                id="volume"
                step="1"
                name="volume"
                min="1"
                max="10"
                onChange={(e) => {
                  setOpacity(parseInt(e.target.value, 10));
                }}
              />
            </div>
            <div>선굵기 :{lineWidth}</div>
            <div>
              <input
                type="range"
                id="volume"
                step="1"
                name="volume"
                min="1"
                max="10"
                onChange={(e) => {
                  setLineWidth(parseInt(e.target.value, 10));
                }}
              />
            </div>

            <div>색상</div>
            <Flex>
              {colors.map((color: string) => (
                <ColorCircle
                  key={color}
                  onClick={() => setLineColor(color)}
                  color={color}
                />
              ))}
            </Flex>
          </Column>
        )}
      </Container>
      <MainCanvas
        ref={canvasRef}
        switch={canvasSwitch}
        onMouseDown={startPaint}
        onMouseMove={paint}
        onMouseUp={stopPaint}
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: absolute;
  top: 0px;
  left: 100px;
  z-index: 2;
`;

const Menu = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;

  & .menu-gruop {
    box-sizing: border-box;
    height: 54px;
    background: #ffffff;
    border: 1px solid #e7e7e7;
    border-radius: 12px;
    display: flex;
    gap: 10px;
    justify-content: center;
    align-items: center;
  }
  & .menu__line {
    border: 1px solid black;
    width: 1px;
    height: 100%;
  }

  & .menu--select-none {
    user-select: none;
  }
`;

const Column = styled.div`
  display: flex;
  background-color: white;
  flex-direction: column;
  border: 1px solid black;
`;

const Flex = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
`;

const ColorCircle = styled.div<{ color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 100%;
  background-color: ${(props) => props.color};
`;

const MainCanvas = styled.canvas<{ switch: boolean }>`
  z-index: 1;
  display: ${(props) => !props.switch && "none"};
`;

const PreviewCanvas = styled.canvas`
  width: 100px;
  height: 100px;
  border: 1px solid black;
  z-index: 3;
`;
