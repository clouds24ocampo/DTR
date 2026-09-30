import React from "react";
import logo from "../../../assets/logo/Logo.png";

type CRMLogoProps = {className?: string};
const CRMLogo: React.FC<CRMLogoProps> = React.memo(({className}) => (
  <img src={logo} alt="CRM Logo" className={className} />
));

const DocumentHeader: React.FC = () => (
  <div className="text-center border-b border-gray-300 pb-2">
    <div className="flex flex-row items-center gap-1 justify-between">
      <CRMLogo className="w-14 h-auto" />
      <div>
        <h2 className="text-md font-bold text-gray-900">
          QUANTUM CLOUD CORPORATION
        </h2>
        <p className="text-xxs text-gray-700 tracking-wide -mt-1">
          Unit 7, Block 1 Lot 23, Home Lane Realty Building, Villa Amparo Subd.,
        </p>
        <p className="text-xxs text-gray-700 tracking-wide -mt-1">
          Bayan Luma IV, Imus, Cavite
        </p>
        <p className="text-xxs text-gray-700 tracking-wide -mt-1">
          +63 917 123 4567
        </p>
      </div>
      <CRMLogo className="w-14 h-auto" />
    </div>
  </div>
);

export default React.memo(DocumentHeader);
