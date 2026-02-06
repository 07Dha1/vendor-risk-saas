import React from 'react';
import { api } from './api';

function ContractsList() {
  const [contracts, setContracts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedContract, setSelectedContract] = React.useState(null);
  const [riskDetails, setRiskDetails] = React.useState(null);

  // Load contracts when component mounts
  React.useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await api.getContracts();
      
      if (response.status === 'success') {
        setContracts(response.contracts);
        console.log('✅ Contracts loaded:', response.contracts);
      }
    } catch (error) {
      console.error('❌ Failed to load contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  // View contract risk details
  const viewRiskDetails = async (contractId) => {
    try {
      const response = await api.getContractAnalysis(contractId);
      
      if (response.status === 'success') {
        setSelectedContract(response.contract);
        setRiskDetails(response.risks);
      }
    } catch (error) {
      console.error('❌ Failed to load risk details:', error);
    }
  };

  // Close risk details modal
  const closeRiskDetails = () => {
    setSelectedContract(null);
    setRiskDetails(null);
  };

  // Get risk score color
  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-600 bg-red-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  // Get status badge color
  const getStatusColor = (status) => {
    if (status === 'analyzed') return 'bg-green-100 text-green-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'failed') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading contracts...</div>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">No contracts uploaded yet</div>
        <div className="text-sm text-gray-400 mt-2">Upload your first contract to get started</div>
      </div>
    );
  }

  return (
    <div>
      {/* Contracts Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Upload Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {contract.original_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {contract.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(contract.upload_date)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatFileSize(contract.file_size)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(contract.risk_score)}`}>
                    {contract.risk_score}/100
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                    {contract.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {contract.status === 'analyzed' && (
                    <button
                      onClick={() => viewRiskDetails(contract.id)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View Risks
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risk Details Modal */}
      {selectedContract && riskDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{selectedContract.filename}</h3>
                  <p className="text-sm text-blue-100 mt-1">
                    Risk Score: {selectedContract.riskScore}/100 | {riskDetails.length} Risks Detected
                  </p>
                </div>
                <button
                  onClick={closeRiskDetails}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {riskDetails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No risks detected in this contract
                </div>
              ) : (
                <div className="space-y-3">
                  {riskDetails.map((risk, index) => (
                    <div
                      key={index}
                      className={`border-l-4 rounded-lg p-4 ${
                        risk.severity === 'high' ? 'border-red-500 bg-red-50' :
                        risk.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded uppercase ${
                              risk.severity === 'high' ? 'bg-red-600 text-white' :
                              risk.severity === 'medium' ? 'bg-yellow-600 text-white' :
                              'bg-green-600 text-white'
                            }`}>
                              {risk.severity}
                            </span>
                            <h4 className="font-semibold text-gray-900">{risk.risk_type}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{risk.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractsList;