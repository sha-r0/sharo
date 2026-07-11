export function validateClient(form) {

    const errors = {};

    if (!form.clientName.trim()) {
        errors.clientName = "Client Name is required";
    }

    if (!form.phone.trim()) {
        errors.phone = "Phone Number is required";
    }

    if (
        form.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
        errors.email = "Invalid Email";
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };

}