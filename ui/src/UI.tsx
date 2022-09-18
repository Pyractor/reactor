import React, { useState, useEffect, useCallback } from "react";
import Slider from "@mui/material/Slider";

export interface Slider {
  kind: "slider";
  value: number;
  min: number;
  max: number;
}

export type UIElement = Slider;

const UIElement = (props: { el: UIElement }) => {
  const { el } = props;
  /* const slider = el as Slider; */
  return <Slider disabled defaultValue={30} aria-label="Disabled slider" />;
};

export default UIElement;
