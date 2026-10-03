CREATE TRIGGER tenant_clinics_clinicinvitation_invited_by_insert BEFORE INSERT ON clinics_clinicinvitation
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.invited_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_clinics_clinicinvitation_invited_by_update BEFORE UPDATE ON clinics_clinicinvitation
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.invited_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_clinics_dataexportaudit_actor_insert BEFORE INSERT ON clinics_dataexportaudit
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.actor_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_clinics_dataexportaudit_actor_update BEFORE UPDATE ON clinics_dataexportaudit
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.actor_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_patients_medicalhistory_patient_insert BEFORE INSERT ON patients_medicalhistory
WHEN (SELECT NEWp.clinic_id FROM patients_patient NEWp WHERE NEWp.id=NEW.patient_id)<>(SELECT related.clinic_id FROM patients_patient related WHERE related.id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_patients_medicalhistory_patient_update BEFORE UPDATE ON patients_medicalhistory
WHEN (SELECT NEWp.clinic_id FROM patients_patient NEWp WHERE NEWp.id=NEW.patient_id)<>(SELECT related.clinic_id FROM patients_patient related WHERE related.id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_patients_familyhistory_patient_insert BEFORE INSERT ON patients_familyhistory
WHEN (SELECT NEWp.clinic_id FROM patients_patient NEWp WHERE NEWp.id=NEW.patient_id)<>(SELECT related.clinic_id FROM patients_patient related WHERE related.id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_patients_familyhistory_patient_update BEFORE UPDATE ON patients_familyhistory
WHEN (SELECT NEWp.clinic_id FROM patients_patient NEWp WHERE NEWp.id=NEW.patient_id)<>(SELECT related.clinic_id FROM patients_patient related WHERE related.id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_consultations_consultation_patient_insert BEFORE INSERT ON consultations_consultation
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM patients_patient related WHERE related.id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_consultations_consultation_patient_update BEFORE UPDATE ON consultations_consultation
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM patients_patient related WHERE related.id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_consultations_consultation_conducted_by_insert BEFORE INSERT ON consultations_consultation
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.conducted_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_consultations_consultation_conducted_by_update BEFORE UPDATE ON consultations_consultation
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.conducted_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_prescription_consultation_insert BEFORE INSERT ON prescriptions_prescription
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM consultations_consultation related WHERE related.id=NEW.consultation_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_prescription_consultation_update BEFORE UPDATE ON prescriptions_prescription
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM consultations_consultation related WHERE related.id=NEW.consultation_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_medication_prescription_insert BEFORE INSERT ON prescriptions_medication
WHEN (SELECT NEWp.clinic_id FROM prescriptions_prescription NEWp WHERE NEWp.id=NEW.prescription_id)<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_medication_prescription_update BEFORE UPDATE ON prescriptions_medication
WHEN (SELECT NEWp.clinic_id FROM prescriptions_prescription NEWp WHERE NEWp.id=NEW.prescription_id)<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_medication_medicine_insert BEFORE INSERT ON prescriptions_medication
WHEN (SELECT NEWp.clinic_id FROM prescriptions_prescription NEWp WHERE NEWp.id=NEW.prescription_id)<>(SELECT related.clinic_id FROM pharmacy_medicine related WHERE related.id=NEW.medicine_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_medication_medicine_update BEFORE UPDATE ON prescriptions_medication
WHEN (SELECT NEWp.clinic_id FROM prescriptions_prescription NEWp WHERE NEWp.id=NEW.prescription_id)<>(SELECT related.clinic_id FROM pharmacy_medicine related WHERE related.id=NEW.medicine_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_remedyfollowupresponse_prescription_insert BEFORE INSERT ON prescriptions_remedyfollowupresponse
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_remedyfollowupresponse_prescription_update BEFORE UPDATE ON prescriptions_remedyfollowupresponse
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_remedyfollowupresponse_previous_prescription_insert BEFORE INSERT ON prescriptions_remedyfollowupresponse
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.previous_prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_remedyfollowupresponse_previous_prescription_update BEFORE UPDATE ON prescriptions_remedyfollowupresponse
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.previous_prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_remedyfollowupresponse_remedy_evaluated_insert BEFORE INSERT ON prescriptions_remedyfollowupresponse
WHEN NEW.clinic_id<>(SELECT (SELECT relatedp.clinic_id FROM prescriptions_prescription relatedp WHERE relatedp.id=related.prescription_id) FROM prescriptions_medication related WHERE related.id=NEW.remedy_evaluated_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_remedyfollowupresponse_remedy_evaluated_update BEFORE UPDATE ON prescriptions_remedyfollowupresponse
WHEN NEW.clinic_id<>(SELECT (SELECT relatedp.clinic_id FROM prescriptions_prescription relatedp WHERE relatedp.id=related.prescription_id) FROM prescriptions_medication related WHERE related.id=NEW.remedy_evaluated_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_procedureentry_prescription_insert BEFORE INSERT ON prescriptions_procedureentry
WHEN (SELECT NEWp.clinic_id FROM prescriptions_prescription NEWp WHERE NEWp.id=NEW.prescription_id)<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_prescriptions_procedureentry_prescription_update BEFORE UPDATE ON prescriptions_procedureentry
WHEN (SELECT NEWp.clinic_id FROM prescriptions_prescription NEWp WHERE NEWp.id=NEW.prescription_id)<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_treatmentplan_prescription_insert BEFORE INSERT ON treatments_treatmentplan
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_treatmentplan_prescription_update BEFORE UPDATE ON treatments_treatmentplan
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_treatmentblock_treatment_plan_insert BEFORE INSERT ON treatments_treatmentblock
WHEN (SELECT NEWp.clinic_id FROM treatments_treatmentplan NEWp WHERE NEWp.id=NEW.treatment_plan_id)<>(SELECT related.clinic_id FROM treatments_treatmentplan related WHERE related.id=NEW.treatment_plan_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_treatmentblock_treatment_plan_update BEFORE UPDATE ON treatments_treatmentblock
WHEN (SELECT NEWp.clinic_id FROM treatments_treatmentplan NEWp WHERE NEWp.id=NEW.treatment_plan_id)<>(SELECT related.clinic_id FROM treatments_treatmentplan related WHERE related.id=NEW.treatment_plan_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_treatmentsession_treatment_block_insert BEFORE INSERT ON treatments_treatmentsession
WHEN (SELECT (SELECT NEWpp.clinic_id FROM treatments_treatmentplan NEWpp WHERE NEWpp.id=NEWp.treatment_plan_id) FROM treatments_treatmentblock NEWp WHERE NEWp.id=NEW.treatment_block_id)<>(SELECT (SELECT relatedp.clinic_id FROM treatments_treatmentplan relatedp WHERE relatedp.id=related.treatment_plan_id) FROM treatments_treatmentblock related WHERE related.id=NEW.treatment_block_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_treatmentsession_treatment_block_update BEFORE UPDATE ON treatments_treatmentsession
WHEN (SELECT (SELECT NEWpp.clinic_id FROM treatments_treatmentplan NEWpp WHERE NEWpp.id=NEWp.treatment_plan_id) FROM treatments_treatmentblock NEWp WHERE NEWp.id=NEW.treatment_block_id)<>(SELECT (SELECT relatedp.clinic_id FROM treatments_treatmentplan relatedp WHERE relatedp.id=related.treatment_plan_id) FROM treatments_treatmentblock related WHERE related.id=NEW.treatment_block_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_sessionfeedback_treatment_session_insert BEFORE INSERT ON treatments_sessionfeedback
WHEN (SELECT (SELECT (SELECT NEWppp.clinic_id FROM treatments_treatmentplan NEWppp WHERE NEWppp.id=NEWpp.treatment_plan_id) FROM treatments_treatmentblock NEWpp WHERE NEWpp.id=NEWp.treatment_block_id) FROM treatments_treatmentsession NEWp WHERE NEWp.id=NEW.treatment_session_id)<>(SELECT (SELECT (SELECT relatedpp.clinic_id FROM treatments_treatmentplan relatedpp WHERE relatedpp.id=relatedp.treatment_plan_id) FROM treatments_treatmentblock relatedp WHERE relatedp.id=related.treatment_block_id) FROM treatments_treatmentsession related WHERE related.id=NEW.treatment_session_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_sessionfeedback_treatment_session_update BEFORE UPDATE ON treatments_sessionfeedback
WHEN (SELECT (SELECT (SELECT NEWppp.clinic_id FROM treatments_treatmentplan NEWppp WHERE NEWppp.id=NEWpp.treatment_plan_id) FROM treatments_treatmentblock NEWpp WHERE NEWpp.id=NEWp.treatment_block_id) FROM treatments_treatmentsession NEWp WHERE NEWp.id=NEW.treatment_session_id)<>(SELECT (SELECT (SELECT relatedpp.clinic_id FROM treatments_treatmentplan relatedpp WHERE relatedpp.id=relatedp.treatment_plan_id) FROM treatments_treatmentblock relatedp WHERE relatedp.id=related.treatment_block_id) FROM treatments_treatmentsession related WHERE related.id=NEW.treatment_session_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_sessionfeedback_therapist_insert BEFORE INSERT ON treatments_sessionfeedback
WHEN (SELECT (SELECT (SELECT NEWppp.clinic_id FROM treatments_treatmentplan NEWppp WHERE NEWppp.id=NEWpp.treatment_plan_id) FROM treatments_treatmentblock NEWpp WHERE NEWpp.id=NEWp.treatment_block_id) FROM treatments_treatmentsession NEWp WHERE NEWp.id=NEW.treatment_session_id)<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.therapist_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_sessionfeedback_therapist_update BEFORE UPDATE ON treatments_sessionfeedback
WHEN (SELECT (SELECT (SELECT NEWppp.clinic_id FROM treatments_treatmentplan NEWppp WHERE NEWppp.id=NEWpp.treatment_plan_id) FROM treatments_treatmentblock NEWpp WHERE NEWpp.id=NEWp.treatment_block_id) FROM treatments_treatmentsession NEWp WHERE NEWp.id=NEW.treatment_session_id)<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.therapist_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_doctoractiontask_treatment_plan_insert BEFORE INSERT ON treatments_doctoractiontask
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM treatments_treatmentplan related WHERE related.id=NEW.treatment_plan_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_doctoractiontask_treatment_plan_update BEFORE UPDATE ON treatments_doctoractiontask
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM treatments_treatmentplan related WHERE related.id=NEW.treatment_plan_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_doctoractiontask_treatment_block_insert BEFORE INSERT ON treatments_doctoractiontask
WHEN NEW.clinic_id<>(SELECT (SELECT relatedp.clinic_id FROM treatments_treatmentplan relatedp WHERE relatedp.id=related.treatment_plan_id) FROM treatments_treatmentblock related WHERE related.id=NEW.treatment_block_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_doctoractiontask_treatment_block_update BEFORE UPDATE ON treatments_doctoractiontask
WHEN NEW.clinic_id<>(SELECT (SELECT relatedp.clinic_id FROM treatments_treatmentplan relatedp WHERE relatedp.id=related.treatment_plan_id) FROM treatments_treatmentblock related WHERE related.id=NEW.treatment_block_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_doctoractiontask_assigned_doctor_insert BEFORE INSERT ON treatments_doctoractiontask
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.assigned_doctor_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_treatments_doctoractiontask_assigned_doctor_update BEFORE UPDATE ON treatments_doctoractiontask
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.assigned_doctor_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_stockentry_medicine_insert BEFORE INSERT ON pharmacy_stockentry
WHEN (SELECT NEWp.clinic_id FROM pharmacy_medicine NEWp WHERE NEWp.id=NEW.medicine_id)<>(SELECT related.clinic_id FROM pharmacy_medicine related WHERE related.id=NEW.medicine_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_stockentry_medicine_update BEFORE UPDATE ON pharmacy_stockentry
WHEN (SELECT NEWp.clinic_id FROM pharmacy_medicine NEWp WHERE NEWp.id=NEW.medicine_id)<>(SELECT related.clinic_id FROM pharmacy_medicine related WHERE related.id=NEW.medicine_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_stockentry_actor_insert BEFORE INSERT ON pharmacy_stockentry
WHEN (SELECT NEWp.clinic_id FROM pharmacy_medicine NEWp WHERE NEWp.id=NEW.medicine_id)<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.actor_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_stockentry_actor_update BEFORE UPDATE ON pharmacy_stockentry
WHEN (SELECT NEWp.clinic_id FROM pharmacy_medicine NEWp WHERE NEWp.id=NEW.medicine_id)<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.actor_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_dispensingrecord_prescription_insert BEFORE INSERT ON pharmacy_dispensingrecord
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_dispensingrecord_prescription_update BEFORE UPDATE ON pharmacy_dispensingrecord
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM prescriptions_prescription related WHERE related.id=NEW.prescription_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_dispensingrecord_dispensed_by_insert BEFORE INSERT ON pharmacy_dispensingrecord
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.dispensed_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_dispensingrecord_dispensed_by_update BEFORE UPDATE ON pharmacy_dispensingrecord
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.dispensed_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_dispensingitem_dispensing_record_insert BEFORE INSERT ON pharmacy_dispensingitem
WHEN (SELECT NEWp.clinic_id FROM pharmacy_dispensingrecord NEWp WHERE NEWp.id=NEW.dispensing_record_id)<>(SELECT related.clinic_id FROM pharmacy_dispensingrecord related WHERE related.id=NEW.dispensing_record_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_dispensingitem_dispensing_record_update BEFORE UPDATE ON pharmacy_dispensingitem
WHEN (SELECT NEWp.clinic_id FROM pharmacy_dispensingrecord NEWp WHERE NEWp.id=NEW.dispensing_record_id)<>(SELECT related.clinic_id FROM pharmacy_dispensingrecord related WHERE related.id=NEW.dispensing_record_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_dispensingitem_medicine_insert BEFORE INSERT ON pharmacy_dispensingitem
WHEN (SELECT NEWp.clinic_id FROM pharmacy_dispensingrecord NEWp WHERE NEWp.id=NEW.dispensing_record_id)<>(SELECT related.clinic_id FROM pharmacy_medicine related WHERE related.id=NEW.medicine_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_pharmacy_dispensingitem_medicine_update BEFORE UPDATE ON pharmacy_dispensingitem
WHEN (SELECT NEWp.clinic_id FROM pharmacy_dispensingrecord NEWp WHERE NEWp.id=NEW.dispensing_record_id)<>(SELECT related.clinic_id FROM pharmacy_medicine related WHERE related.id=NEW.medicine_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_integrations_ruthvajourneyref_patient_insert BEFORE INSERT ON integrations_ruthvajourneyref
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM patients_patient related WHERE related.id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_integrations_ruthvajourneyref_patient_update BEFORE UPDATE ON integrations_ruthvajourneyref
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM patients_patient related WHERE related.id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_integrations_ruthvajourneyref_consultation_insert BEFORE INSERT ON integrations_ruthvajourneyref
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM consultations_consultation related WHERE related.id=NEW.consultation_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_integrations_ruthvajourneyref_consultation_update BEFORE UPDATE ON integrations_ruthvajourneyref
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM consultations_consultation related WHERE related.id=NEW.consultation_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_feedback_feedback_user_insert BEFORE INSERT ON feedback_feedback
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER tenant_feedback_feedback_user_update BEFORE UPDATE ON feedback_feedback
WHEN NEW.clinic_id<>(SELECT related.clinic_id FROM users_user related WHERE related.id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
