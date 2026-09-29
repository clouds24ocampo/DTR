/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCategories, fetchJobPosts } from "../api/hr/jobcategory.api";
import { fetchApplicants } from "../api/hr/dashboard.api";
import { fetchEmployees } from "../api/hr/employee.api";
import { fetchDocuments } from "../api/hr/document/document.api";
import {
  fetchConversations,
  fetchMessages,
  fetchMessengerUsers,
} from "../api/global/messaging/messaging.api";
import { useAppStore } from "../stores/hr/admin/app.store";

export function useFetchData() {
  const filteredPosts = useAppStore((s) => s.filteredPosts);
  const setFilteredPosts = useAppStore((s) => s.setFilteredPosts);

  const toCategory = useAppStore((s) => s.categories);
  const setToCategory = useAppStore((s) => s.setCategories);

  const filteredApplicants = useAppStore((s) => s.applicants);
  const setFilteredApplicants = useAppStore((s) => s.setApplicants);

  const filteredEmployee = useAppStore((s) => s.employees);
  const setFilteredEmployee = useAppStore((s) => s.setEmployees);

  const filteredDocuments = useAppStore((s) => s.documents);
  const setFilteredDocuments = useAppStore((s) => s.setDocuments);

  const rawMessengerUsers = useAppStore((s) => s.messengerUsers);
  const setFilteredMessengerUsers = useAppStore((s) => s.setMessengerUsers);

  const rawConversations = useAppStore((s) => s.conversations);
  const setFilteredConversations = useAppStore((s) => s.setConversations);

  const rawMessages = useAppStore((s) => s.messages);
  const setFilteredMessages = useAppStore((s) => s.setMessages);

  const [loading, setLoading] = useState(false);

  const filteredMessengerUsers = useMemo(() => rawMessengerUsers || [], [rawMessengerUsers]);
  const filteredConversations = useMemo(() => rawConversations || [], [rawConversations]);
  const filteredMessages = useMemo(() => rawMessages || [], [rawMessages]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        jobPosts,
        categories,
        applicantsResponse,
        employeesResponse,
        documentsResponse,
        messengerUsersResponse,
        conversationsResponse,
        messagesResponse,
      ] = await Promise.all([
        fetchJobPosts(),
        fetchCategories(),
        fetchApplicants(),
        fetchEmployees(),
        fetchDocuments(),
        fetchMessengerUsers(),
        fetchConversations(),
        fetchMessages(),
      ]);

      setFilteredPosts(Array.isArray(jobPosts) ? jobPosts : []);
      setToCategory(Array.isArray(categories) ? categories : []);
      setFilteredApplicants(applicantsResponse?.data?.applications || []);
      setFilteredEmployee(employeesResponse?.data || []);
      setFilteredDocuments(documentsResponse?.data || []);
      setFilteredMessengerUsers(messengerUsersResponse?.data || []);
      setFilteredConversations(conversationsResponse?.data || []);
      setFilteredMessages(messagesResponse?.data || []);
    } catch {
      setFilteredPosts([]);
      setToCategory([]);
      setFilteredApplicants([]);
      setFilteredEmployee([]);
      setFilteredDocuments([]);
      setFilteredMessengerUsers([]);
      setFilteredConversations([]);
      // setFilteredMessages([]); // optional: keep cached messages on error
    } finally {
      setLoading(false);
    }
  }, [
    setFilteredPosts,
    setToCategory,
    setFilteredApplicants,
    setFilteredEmployee,
    setFilteredDocuments,
    setFilteredMessengerUsers,
    setFilteredConversations,
    setFilteredMessages,
  ]);

  useEffect(() => {
    fetchAll();
  }, []);

  return {
    filteredPosts,
    toCategory,
    loading,
    filteredApplicants,
    filteredEmployee,
    filteredDocuments,
    filteredMessengerUsers,
    filteredConversations,
    filteredMessages,
    refetchAll: fetchAll,
  };
}
