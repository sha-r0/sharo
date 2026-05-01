"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Paper,
  Stack,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

import { useUsers } from "@/app/allhooks/useUsers";

export default function ProjectFormDialog({
  open,
  onClose,
  step,
  setStep,
  formData,
  setField,
  companyId,
  onSelectEmployeeForRow,
  onChangeHoursForRow,
  addEmployeeRow,
  removeEmployeeRow,
  previewTotalExpense = 0,
  previewProfit = 0,
  handleSaveProject,
}) {

  const { users, loading } = useUsers(companyId);

  const clients = ["Rohit", "Suresh", "Amit", "Neha", "Pooja"];

  // ✅ added missing function
  const calcTimeProgress = (start, end) => {
    if (!start || !end) return 0;

    const s = new Date(start);
    const e = new Date(end);
    const now = new Date();

    const total = e - s;
    const done = now - s;

    return Math.max(0, Math.min(100, (done / total) * 100));
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>

      <DialogTitle>Create Project</DialogTitle>

      <DialogContent dividers>

        {/* ===== STEPPER ===== */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", color: step >= 1 ? "white" : "gray", background: step >= 1 ? "primary.main" : "#f0f0f0" }}>1</Box>
            <Typography variant="body2" color={step >= 1 ? "text.primary" : "text.secondary"}>Info</Typography>
          </Box>
          <Box sx={{ flex: 1, height: 1, background: "#eee" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", color: step >= 2 ? "white" : "gray", background: step >= 2 ? "primary.main" : "#f0f0f0" }}>2</Box>
            <Typography variant="body2" color={step >= 2 ? "text.primary" : "text.secondary"}>Employees</Typography>
          </Box>
          <Box sx={{ flex: 1, height: 1, background: "#eee" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", color: step >= 3 ? "white" : "gray", background: step >= 3 ? "primary.main" : "#f0f0f0" }}>3</Box>
            <Typography variant="body2" color={step >= 3 ? "text.primary" : "text.secondary"}>Review</Typography>
          </Box>
        </Box>

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <Box component="form" noValidate autoComplete="off">
            <Stack spacing={2}>
              <TextField label="Project Name *" value={formData.name} onChange={(e) => setField("name", e.target.value)} fullWidth size="small" />

              <FormControl fullWidth size="small">
                <InputLabel>Client *</InputLabel>
                <Select
                  label="Client *"
                  value={formData.client}
                  onChange={(e) => setField("client", e.target.value)}
                >
                  <MenuItem value="">Select Client</MenuItem>

                  {clients.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField label="PO Amount" type="number" value={formData.poAmount} onChange={(e) => setField("poAmount", e.target.value)} size="small" />
              <TextField label="Budget *" type="number" value={formData.budget} onChange={(e) => setField("budget", e.target.value)} size="small" />

              <Stack direction="row" spacing={5}>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ mb: 0.5 }}>
                    Start Date
                  </Typography>

                  <TextField
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setField("startDate", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ mb: 0.5 }}>
                    End Date
                  </Typography>

                  <TextField
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setField("endDate", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ mb: 0.5 }}>
                    Status
                  </Typography>

                  <FormControl size="small" fullWidth>
                    <Select
                      value={formData.status || "Pending"}
                      onChange={(e) => setField("status", e.target.value)}
                    >
                      {["Pending", "In Progress", "Completed", "Delayed"].map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

              </Stack>

              <TextField label="Description" value={formData.description} onChange={(e) => setField("description", e.target.value)} fullWidth multiline rows={3} size="small" />

            </Stack>
          </Box>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Assign employees and their hours (expense auto-calculated)
            </Typography>

            <Box sx={{ maxHeight: 320, overflow: "auto", pr: 1, pt: 1 }}>
              {(formData.assignedEmployees || []).map((row, idx) => (
                <Stack
                  key={idx}
                  direction="row"
                  spacing={1.5}
                  sx={{ mb: 1, alignItems: "center" }}
                >

                  {/* Employee (FIXED) */}
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel id={`emp-label-${idx}`}>Employee</InputLabel>

                    <Select
                      labelId={`emp-label-${idx}`}   // ✅ IMPORTANT
                      label="Employee"               // ✅ IMPORTANT
                      value={row.id || ""}
                      onChange={(e) => onSelectEmployeeForRow(idx, e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Select Employee</em>
                      </MenuItem>

                      {users.map((emp) => (
                        <MenuItem key={emp.id} value={emp.id}>
                          {emp.name} • ₹{emp.salary}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Target Hours (FIXED LABEL) */}
                  <TextField
                    size="small"
                    type="number"
                    label="Target Hours"
                    value={row.targetHours || ""}
                    onChange={(e) => {
                      const hours = Number(e.target.value) || 0;
                      const arr = [...formData.assignedEmployees];
                      arr[idx] = { ...arr[idx], targetHours: hours };
                      setField("assignedEmployees", arr);
                    }}
                    sx={{ width: 140, mt: 1 }}   // ✅ FIX
                  />

                  {/* Amount */}
                  <Box sx={{ minWidth: 90, fontWeight: 500 }}>
                    ₹ {Number(row.expenseFromHours || 0).toFixed(2)}
                  </Box>

                  {/* Button */}
                  {idx === formData.assignedEmployees.length - 1 ? (
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ minWidth: 40, height: 36 }}
                      onClick={addEmployeeRow}
                    >
                      +
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      sx={{ minWidth: 40, height: 36 }}
                      onClick={() => removeEmployeeRow(idx)}
                    >
                      ✕
                    </Button>
                  )}

                </Stack>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2">
              Employee expense (computed): <strong>₹ {previewTotalExpense.toFixed(2)}</strong>
            </Typography>
          </Box>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Review</Typography>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack spacing={1}>
                <Box className="flex justify-between">
                  <Typography variant="body2">Employee Expense</Typography>
                  <Typography variant="body2">₹ {previewTotalExpense.toFixed(2)}</Typography>
                </Box>

                <Box className="flex justify-between">
                  <Typography variant="body2">Budget</Typography>
                  <Typography variant="body2">₹ {Number(formData.budget || 0).toFixed(2)}</Typography>
                </Box>

                <Box className="flex justify-between">
                  <Typography variant="body2">Profit</Typography>
                  <Typography variant="body2" sx={{ color: previewProfit >= 0 ? "green" : "red" }}>
                    ₹ {previewProfit.toFixed(2)}
                  </Typography>
                </Box>

                <Box className="flex justify-between">
                  <Typography variant="body2">Time Progress</Typography>
                  <Typography variant="body2">
                    {Math.round(calcTimeProgress(formData.startDate, formData.endDate))}%
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Typography variant="subtitle2">Assigned Employees</Typography>

            <Paper sx={{ p: 2 }}>
              {(formData.assignedEmployees || []).map((a, i) => (
                <Stack key={i} direction="row" sx={{ mb: 1, justifyItems: "space-between" }}>
                  <Box>
                    <div style={{ fontWeight: 600 }}>{a.name || "—"}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Salary: ₹{Number(a.salary || 0).toLocaleString()} • Hours: {a.targetHours || 0}
                    </div>
                  </Box>
                  <div style={{ fontWeight: 700 }}>
                    ₹ {Number(a.expenseFromHours || 0).toFixed(2)}
                  </div>
                </Stack>
              ))}

              {(formData.assignedEmployees || []).length === 0 && (
                <div style={{ color: "#666" }}>No employees assigned</div>
              )}
            </Paper>
          </Box>
        )}

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flex: 1, pl: 1 }}>
          <Typography variant="caption">
            Preview total expense: ₹{previewTotalExpense.toFixed(2)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {step > 1 && <Button onClick={() => setStep((s) => s - 1)}>Back</Button>}

          {step < 3 ? (
            <Button variant="contained" onClick={() => setStep((s) => Math.min(3, s + 1))}>
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              onClick={handleSaveProject}
            >
              Create
            </Button>
          )}

          <Button onClick={onClose}>Cancel</Button>
        </Stack>
      </DialogActions>

    </Dialog>
  );
}