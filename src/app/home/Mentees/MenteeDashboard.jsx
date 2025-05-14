"use client";
import React from "react";
import ViewMentorsList from "./ViewMentorsList";
import ViewAppointments from "./ViewAppointments";

const MenteeDashboard = () => {
  return (
    <div>
      <ViewAppointments />
      <ViewMentorsList />
    </div>
  );
};

export default MenteeDashboard;
