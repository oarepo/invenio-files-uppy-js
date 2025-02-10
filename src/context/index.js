/*
 * This file is part of Invenio-Files-Uppy-Js.
 * Copyright (C) 2025 CERN.
 * Copyright (C) 2025 CESNET.
 *
 * Invenio-Files-Uppy-Js is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */
import * as React from "react";
import { createContext } from "react";
import PropTypes from "prop-types";

export const UppyContext = createContext();

export const UppyProvider = ({ uppy, children }) => {
  return <UppyContext.Provider value={uppy}>{children}</UppyContext.Provider>;
};

UppyProvider.propTypes = {
  uppy: PropTypes.object.isRequired,
  children: PropTypes.node,
};

UppyProvider.defaultProps = {
  children: undefined,
};
