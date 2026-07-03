export async function validateSignup(data) {
    const response = await fetch("/api/signup/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyEmail: data.companyEmail,
        adminEmail: data.adminEmail,
        corporateId: data.corporateId,
      }),
    });
  
    return response.json();
  }