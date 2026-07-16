"use client";

import { useCallback, useEffect, useState } from "react";

import employeeService from "@/app/allservice/employee/employeeService";
import clientService from "../../clients/services/clientService";
import vendorRepository from "../../vendors/services/VendorRepository";

export default function useProjectData(companyId) {

    const [loading, setLoading] = useState(true);

    const [clients, setClients] = useState([]);

    const [employees, setEmployees] = useState([]);

    const [managers, setManagers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {

        if (!companyId) {

            setLoading(false);
        
            return;
        
        }

        try {

            setLoading(true);

            const [

                clientData,

                employeeData,

                managerData,
                vendorData,

            ] = await Promise.all([

                clientService.getClients(companyId),

                employeeService.getEmployees(companyId),

                employeeService.getManagers(companyId),
                vendorRepository.getAll(companyId),

            ]);

            setClients(clientData);

            setEmployees(employeeData);

            setManagers(managerData);
            setVendors(vendorData.filter((item) => String(item.status || "active").toLowerCase() === "active"));

        }

        catch (error) {

            console.error(error);
        
            setError(error.message);
        
        }

        finally {

            setLoading(false);

        }

    }, [companyId]);

    useEffect(() => {

        load();

    }, [load]);

    return {

        loading,

        error,
    
        clients,
    
        employees,
    
        managers,
        vendors,
    
        refresh: load,

    };

}
