import BaseService from "../base/baseService";

import {

    companyDoc,

    companiesCollection,

} from "@/services/firestorePaths";

class CompanyRepository extends BaseService {

    constructor(){

        super();

    }

    async get(companyId){

        return await this.getDocument(

            companyDoc(companyId)

        );

    }

    async update(companyId,data){

        return await super.update(

            companyDoc(companyId),

            data

        );

    }

}

const companyRepository =
    new CompanyRepository();

export default companyRepository;