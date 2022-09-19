import React, { useState } from "react";

import Box from "@mui/material/Box";
import { Slider as SliderEl } from "@mui/material";

export interface Slider {
  kind: "slider";
  id: string;
  value: number;
  min: number;
  max: number;
}

export type UIElement = Slider;

const SliderComponent = (props: {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (id: string, value: any) => void;
}) => {
  const { id, value, min, max, onChange } = props;
  const [v, setV] = useState(value);

  const handleChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setV(value);
    onChange(id, value);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        my: 1,
      }}
    >
      <Box sx={{ minWidth: 30 }}>{v}</Box>
      <SliderEl onChange={handleChange} value={v} min={min} max={max} />
    </Box>
  );
};

const UIElementComponent = (props: {
  el: UIElement;
  onChange: (id: string, value: any) => void;
}) => {
  const { el, onChange } = props;
  /* const slider = el as Slider; */
  return (
    <SliderComponent
      id={el.id}
      value={el.value}
      min={el.min}
      max={el.max}
      onChange={onChange}
    />
  );
};

export default UIElementComponent;
