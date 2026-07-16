import { collection, doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
class InvoiceRepository {
 collection(companyId){return collection(db,"Companies",companyId,"Invoices");}
 async get(companyId,id){const snapshot=await getDoc(doc(this.collection(companyId),id));return snapshot.exists()?{id:snapshot.id,...snapshot.data()}:null;}
 async create(companyId,payload){const invoiceRef=doc(this.collection(companyId));const companyRef=doc(db,"Companies",companyId);return runTransaction(db,async(transaction)=>{const company=await transaction.get(companyRef);const sequence=Number(company.data()?.sequences?.invoice||0)+1;const year=new Date().getFullYear();const invoiceNumber=`INV/${year}/${String(sequence).padStart(5,"0")}`;transaction.set(invoiceRef,{...payload,id:invoiceRef.id,invoiceNumber,companyId,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});transaction.set(companyRef,{sequences:{...(company.data()?.sequences||{}),invoice:sequence}},{merge:true});return{id:invoiceRef.id,invoiceNumber};});}
 update(companyId,id,data){return updateDoc(doc(this.collection(companyId),id),{...data,updatedAt:serverTimestamp()});}
 saveSettings(companyId,data){return setDoc(doc(db,"Companies",companyId,"BillingSettings","default"),{...data,updatedAt:serverTimestamp()},{merge:true});}
 saveTemplate(companyId,data){return setDoc(doc(db,"Companies",companyId,"InvoiceTemplates","default"),{...data,id:"default",updatedAt:serverTimestamp()},{merge:true});}
}
export default new InvoiceRepository();
